## generic interface

need to be able to


```
var ffa = new FFA(16, {sizes: [4]}) // and not set limits
// but want the top 6 (i.e. 1st placers plus top two 2nd placers)

// after ffa.isDone();
var tb = TieBreaker.from(ffa, 6);
if (tb.isDone()) { // cool, we can pick the top 6
  return tb.results().slice(0, 6);
}
else {
  // score tb match (one match containing 2nd placers from the ffa quarter games)
  tb.score(tb.matches[0].id, [4,3,2,1]);
  return tb.results().slice(0, 6);
}
```

MUST also be able to use it in the classic way by replacing `FFA(16, { sizes: [4] })` with `GroupStage(16, { groupSize: 4 })`.

SHOULD also be able to use it on duel tournaments (they simply have well defined ties - so have the limit points battle)

## should we though
a problem is that the logic isn't too hard to implement in specific tournaments:

- duel bronze (fixes the top 3 pass on case)
- ffa (non multiple of matches in final) limits
- groupstage (multiple of number of groups) limits

It's just if we always want arbitrary limits where `0 < n < trn.size` then we can't account for everything.

Think the FFA case above is equivalent to the GroupStage one because the last match IS isomorphic to the group standings as far as TieBreaker is concerned

## idea
have tiebreake function optionally on standings by looking differently at results

```
var numFinals = numGroups || numMatchesInMaxRound; // new numGroups
var maxSize = maxGroupSize || maxMatchSize; // new groupSize
// this should just be ceil(oldRes.length / numFinals)

```

