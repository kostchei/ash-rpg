"""Design simulation, not runtime policy. Run: python scripts/audit-site-count.py.
Site rooms use the existing d10 feature mix, with guaranteed loot for all
monster/boss/cache rooms per the owner's 2026-09-07 clarification.
One expedition per site, 50% distinct treasure objective, one random encounter
with 50% loot. Recovery applies independently to all loot sources.
Quality uses party level as a proxy for the reward's actual table level.
Story awards are always earned; no carousing or final-boss rewards.
"""
import random
import statistics
import math
import json


def simulate(rooms, recovery, runs=10000):
    rng = random.Random(20260907 + rooms)
    counts, splits = [], []
    for _ in range(runs):
        level, xp = 1, 0
        actcounts = []

        def award(amount):
            nonlocal level, xp
            xp += amount
            if xp >= level * 10:
                level += 1
                xp = 0

        def loot():
            r = rng.random()
            if level <= 3:
                amount = 1 if r < .75 else 3
            elif level <= 6:
                amount = 1 if r < .5 else 3 if r < .95 else 10
            else:
                amount = 1 if r < .3 else 3 if r < .85 else 10
            if rng.random() < recovery:
                award(amount)

        for target in [4, 7, 9]:
            n = 0
            while level < target:
                n += 1
                for _room in range(rooms):
                    if rng.randrange(10) in [4, 6, 8, 9]:
                        loot()
                if rng.random() < .5:
                    loot()
                if rng.random() < .5:
                    loot()
                award(1)
                if target < 9 and (level >= target or
                                   (level == target - 1 and xp + 3 >= level * 10)):
                    award(3)
                    break
            actcounts.append(n)
        counts.append(sum(actcounts))
        splits.append(actcounts)
    ordered = sorted(counts)
    return dict(rooms=rooms, recovery=recovery, runs=runs,
                mean=round(statistics.mean(counts), 1),
                median=statistics.median(counts),
                p90=ordered[math.ceil(.9 * runs) - 1],
                meanActSites=[round(statistics.mean(x[i] for x in splits), 1)
                              for i in range(3)])


if __name__ == "__main__":
    print(json.dumps([simulate(rooms, recovery)
                      for rooms in [5, 10, 15, 20]
                      for recovery in [1, .8]], indent=2))
