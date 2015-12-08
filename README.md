# TieBreaker
[![npm status](http://img.shields.io/npm/v/tiebreaker.svg)](https://www.npmjs.org/package/tiebreaker)
[![build status](https://secure.travis-ci.org/clux/tiebreaker.svg)](http://travis-ci.org/clux/tiebreaker)
[![dependency status](https://david-dm.org/clux/tiebreaker.svg)](https://david-dm.org/clux/tiebreaker)
[![coverage status](http://img.shields.io/coveralls/clux/tiebreaker.svg)](https://coveralls.io/r/clux/tiebreaker)

## Overview
TieBreaker deals within _groups_ ties in tournaments that has group-like equivalents. Such tournaments include:

- [GroupStage](https://npmjs.org/package/groupstage)
- [FFA](https://npmjs.org/package/ffa) (when using a multiple match final round)

But `TieBreaker` will break ties for any tournament that implements `rawPositions`, a special method that converts results into a raw array of positions per "group".

## Usage
Unlike every other tournament type, this tournament CAN NOT be created directly. It needs a finished tournament instance to be created from, and the number of players we want to pick from this tournament:

```js
var gs = new GroupStage(8, { groupSize: 4 });
// score groupstage so that we have some ties
gs.matches.forEach(function (m, i) {
  if (m.id.s === 1) {
    gs.score(m.id, i === 2 ? [1,0] : [1, 1]);
  }
  if (m.id.s === 2) {
    gs.score(m.id, ([4].indexOf(m.id.r) >= 0) ? [1, 0] : [0, 1]);
  }
});
gs.isDone(); // true
```

In this case the group stage is tied in the following ways:

- group one: 1st: [1], 2nd: [3,8], 4th: [6]
- group two: 1st: [4,5,7], 4th: [2]

Then, we may create tiebreakers in one of two ways, the simplest creates an `FFA` style match for each group where we need to break it up:

```js
var tb = TieBreaker.from(gs, 4); // want the top 4
tb.matches;
[ { id: { s: 1, r: 1, m: 1 }, // group 1 tiebreaker
    p: [ 3, 8 ] },
  { id: { s: 2, r: 1, m: 1 }, // group 2 tiebreaker
    p: [ 4, 5, 7 ] } ]

tb.score(tb.matches[0].id, [2,1]);
tb.score(tb.matches[1].id, [3,2,1]);
var top4 = tb.results().slice(0, 4); // will contain results for 1,3,4,5
```

The more advanced creates mini groupstages for each group involving the tied players:

```js
var tb = TieBreaker.from(gs, 4, { grouped: true });
tb.matches;
[ { id: { s: 1, r: 1, m: 1 }, p: [ 3, 8 ] },
  // group 2 tiebreaker subgroup
  { id: { s: 2, r: 1, m: 1 }, p: [ 5, 7 ] },
  { id: { s: 2, r: 2, m: 1 }, p: [ 4, 7 ] },
  { id: { s: 2, r: 3, m: 1 }, p: [ 4, 5 ] } ]
```

Because `tb.matches` is a non-empty array, there were ties that meant isolating the top 4 was impossible. Depending on how many players we request to forward (in this case 4), `TieBreaker` may need more or fewer matches played.


## Resolution
At the end of the `TieBreaker` tournament, you can call results and get the newly positioned results array. However, unless you were creating the tournament in `strict` mode, the ties may not have been broken fully.

```js
tb.matches.forEach(function (m) {
// tie all the tiebreaker matches in group 2 (continuing grouped example)
  tb.score(m.id, (m.id.s === 2) ? [1,1] : [2,1]);
});
tb.isDone(); // true
TieBreaker.isNecessary(tb, 4); // true
```

In this case we would need to recreate the `TieBreaker` from the previous instance. Until the conflict has been resolved, you will need to keep doing this:

```js
// recreate tiebreaker from partially broken/unbroken tiebreaker instance
var tb2 = TieBreaker.from(tb, 4);
tb2.matches;
[ { id: { s: 2, r: 1, m: 1 }, p: [ 5, 7 ] },
  { id: { s: 2, r: 2, m: 1 }, p: [ 4, 7 ] },
  { id: { s: 2, r: 3, m: 1 }, p: [ 4, 5 ] } ]
```

Repeating this procedure will eventually lead to a tiebreaker result where `!TieBreaker.isNecessary(prevTb, 4)`. In this case you can pick out the top 4 by slicing the results, or simply using `.from` on your next tournament.

```js
tb2.isDone(); // true
TieBreaker.isNecessary(tb2, 4); // false - assume we unbroke group 2 in tb2
var top4 = tb2.results().slice(0, 4); // results for top 4

// send the top 4 players from the groupstage to a two-round duel tournament
var duel = Duel.from(tb2, 4);
```

## Why should you use this module
Without going into detail, it is fairly easy to end up in a situation where you have many different multi-way ties. The following is a `GroupStage` test case:

- group one: 1sts: [1,2,6], 4ths: [8]
- group two: 1sts: [5], 2nds: [3,4,7]

If we get the results from `GroupStage`, it will say that `[1,2,5,6]` are all 1st placers, and thus tie all these four `results[i].pos` attributes at `1`.
If we wanted the top 4 to proceed to a different tournament we would end up picking three players from group 1 and one player from group 2.

While this seems terrible, `GroupStage` have nonetheless computed the results to the best of its knowledge.

By specifying the number of players you want to extract, `TieBreaker` can create matches needed to forward the top `n` players ([a multiple of the number of groups](#limitations)) to another tournament _fairly_.

## Example
Using the ties outlined above, if we:
### Require top 4
Then need to break:

- 1st place cluster [1,2,6] - then pick top 2 to proceed
- 2nd place cluster [3,4,7] - then pick winner to proceed

That gives 3 out of the 4 to proceed, and the last is player 5 who won his group alone and is guaranteed through.

### Require top 2
Then only need to break the 1st place cluster in group 1, because we know 5 is one of the top 2.

### Require top 6
Only need to break the 2nd place cluster from group 2, because we know [1,2,6] are all in the top 6.

## Viewing results
Results out from a `TieBreaker` instance are identical to the results received from the tournament we are breaking. The only difference is that we modify the `pos` attributes in two ways:

- Until the TieBreaker is done - we demote players in the TieBreaker to an assumed worst outcome
- After TieBreaker is done - we can safely pick the top `n` (fairly) by simply filtering by `r.pos <= n`, or by calling `slice(0, n)`
- The `gpos` attributes are modified
- The `pos` attributes are at the end built up like `GroupStage`

## Limitations
`TieBreaker` only allows a multiple of the number of groups/sections to be chosen, lest unfair inferences about positions between groups needs to be made. See [issue #3](https://github.com/clux/tiebreaker/issues/3).

### Extras
While TieBreaker implements `results` and `from` slightly differently than any other tournament, is still a perfectly valid [tournament](https://npmjs.org/package/tournament). All the methods available on the tournament base class exist on `TieBreaker`. Read the [tournament API](https://github.com/clux/tournament/master/blob/doc/base.md)

## License
MIT-Licensed. See LICENSE file for details.
