import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { NetworkInterfaceInfo } from "node:os";
import request from "supertest";
import { resolveHostAddress, createAshServer } from "../src/server/app.js";

describe("Network Discovery and Host Resolution", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.HOST_IP;
    delete process.env.ASH_HOST;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("prioritizes Wi-Fi over virtual network adapters (WSL / Docker / Hyper-V)", () => {
    const mockInterfaces: NodeJS.Dict<NetworkInterfaceInfo[]> = {
      "vEthernet (WSL)": [
        {
          address: "172.28.16.1",
          netmask: "255.255.240.0",
          family: "IPv4",
          mac: "00:15:5d:00:00:01",
          internal: false,
          cidr: "172.28.16.1/20",
        },
      ],
      "docker0": [
        {
          address: "172.17.0.1",
          netmask: "255.255.0.0",
          family: "IPv4",
          mac: "02:42:00:00:00:01",
          internal: false,
          cidr: "172.17.0.1/16",
        },
      ],
      "Wi-Fi": [
        {
          address: "192.168.1.150",
          netmask: "255.255.255.0",
          family: "IPv4",
          mac: "aa:bb:cc:dd:ee:ff",
          internal: false,
          cidr: "192.168.1.150/24",
        },
      ],
    };

    const resolved = resolveHostAddress(undefined, () => mockInterfaces);
    expect(resolved.address).toBe("192.168.1.150");
    expect(resolved.interfaceName).toBe("Wi-Fi");
  });

  it("prioritizes physical Ethernet over virtual switches", () => {
    const mockInterfaces: NodeJS.Dict<NetworkInterfaceInfo[]> = {
      "vEthernet (Default Switch)": [
        {
          address: "172.23.64.1",
          netmask: "255.255.240.0",
          family: "IPv4",
          mac: "00:15:5d:00:00:02",
          internal: false,
          cidr: "172.23.64.1/20",
        },
      ],
      "Ethernet": [
        {
          address: "192.168.1.55",
          netmask: "255.255.255.0",
          family: "IPv4",
          mac: "11:22:33:44:55:66",
          internal: false,
          cidr: "192.168.1.55/24",
        },
      ],
    };

    const resolved = resolveHostAddress(undefined, () => mockInterfaces);
    expect(resolved.address).toBe("192.168.1.55");
    expect(resolved.interfaceName).toBe("Ethernet");
  });

  it("ignores internal loopback and link-local (169.254.x.x) addresses", () => {
    const mockInterfaces: NodeJS.Dict<NetworkInterfaceInfo[]> = {
      "Loopback": [
        {
          address: "127.0.0.1",
          netmask: "255.0.0.0",
          family: "IPv4",
          mac: "00:00:00:00:00:00",
          internal: true,
          cidr: "127.0.0.1/8",
        },
      ],
      "Ethernet Autoconfig": [
        {
          address: "169.254.80.12",
          netmask: "255.255.0.0",
          family: "IPv4",
          mac: "aa:bb:cc:11:22:33",
          internal: false,
          cidr: "169.254.80.12/16",
        },
      ],
    };

    const resolved = resolveHostAddress(undefined, () => mockInterfaces);
    expect(resolved.address).toBe("localhost");
    expect(resolved.interfaceName).toBe("loopback");
  });

  it("respects explicit preferredIp argument over detected interfaces", () => {
    const mockInterfaces: NodeJS.Dict<NetworkInterfaceInfo[]> = {
      "Wi-Fi": [
        {
          address: "192.168.1.150",
          netmask: "255.255.255.0",
          family: "IPv4",
          mac: "aa:bb:cc:dd:ee:ff",
          internal: false,
          cidr: "192.168.1.150/24",
        },
      ],
    };

    const resolved = resolveHostAddress("10.0.0.42", () => mockInterfaces);
    expect(resolved.address).toBe("10.0.0.42");
    expect(resolved.interfaceName).toBe("manual override");
  });

  it("respects HOST_IP environment variable override", () => {
    process.env.HOST_IP = "192.168.1.200";
    const resolved = resolveHostAddress();
    expect(resolved.address).toBe("192.168.1.200");
    expect(resolved.interfaceName).toBe("manual override");
  });

  it("passes hostIp option to createAshServer and exposes hostAddress and baseUrl", async () => {
    const server = await createAshServer({
      dbPath: ":memory:",
      port: 0,
      frontend: false,
      hostIp: "192.168.1.99",
    });

    try {
      expect(server.hostAddress).toBe("192.168.1.99");
      expect(server.interfaceName).toBe("manual override");
      expect(server.baseUrl).toContain("http://192.168.1.99:");
    } finally {
      await server.close();
    }
  });

  it("exposes /api/network/interfaces returning available interfaces and current host", async () => {
    const server = await createAshServer({
      dbPath: ":memory:",
      port: 0,
      frontend: false,
    });

    try {
      const res = await request(server.app).get("/api/network/interfaces");
      expect(res.status).toBe(200);
      expect(res.body.current).toBeDefined();
      expect(res.body.current.address).toBe(server.hostAddress);
      expect(Array.isArray(res.body.interfaces)).toBe(true);
      expect(res.body.port).toBe(server.port);
    } finally {
      await server.close();
    }
  });

  it("generates QR code with custom ip or host override query parameters", async () => {
    const server = await createAshServer({
      dbPath: ":memory:",
      port: 0,
      frontend: false,
    });

    try {
      const camp = server.db.createCampaign("Test LAN", "Borderlands", "1234");
      const code = String(camp.code);

      const qrResDefault = await request(server.app).get(`/api/campaigns/${code}/qr`);
      expect(qrResDefault.status).toBe(200);
      expect(qrResDefault.headers["content-type"]).toContain("image/png");

      const qrResCustomIp = await request(server.app).get(`/api/campaigns/${code}/qr?ip=192.168.1.50`);
      expect(qrResCustomIp.status).toBe(200);
      expect(qrResCustomIp.headers["content-type"]).toContain("image/png");
    } finally {
      await server.close();
    }
  });
});
