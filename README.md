# TieBreaker
[![Build Status](https://secure.travis-ci.org/clux/tiebreaker.png)](http://travis-ci.org/clux/tiebreaker)
[![Dependency Status](https://david-dm.org/clux/tiebreaker.png)](https://david-dm.org/clux/tiebreaker)

    Stability: 2 - Unstable

## Overview
TieBreaker deals with between _groups_ and within _groups_ ties in tournaments that has group-like equivalents. Such tournaments include:

- [GroupStage](https://npmjs.org/package/groupstage)
- [FFA](https://npmjs.org/package/ffa) (when using a multiple match final round)

But `TieBreaker` will break ties for any tournament that implements `rawPositions`, a special method that converts results into a raw array of ties.

## Problem
Suppose you have a difficult tie situation in a `GroupStage` 8 players in groups of 4. Without going into detail, it is fairly easy to end up in a situation (check test scenarios) where you have two different three way ties:

- group 1: 1st: [1,2,6], 4th: [8]
- group 2: 1st: [5], 2nd: [3,4,7]

This is problematic because if we get the results from `GroupStage`, it will see that [1,2,5,6] are all 1st placers, and thus all tie their `resEl.pos` attributes at `1`.
If we wanted the top 4 to proceed to a different tournament we would end up picking 3 players from group one and 1 player from group two, which is awful.

## Solution
Create a match for each group we need to break, and optionally break each groups x-placers at the advancement point.

### Example
This is best explained through example. Assume ties like above:

#### Require top 4
Then need to break:

- 1st place cluster [1,2,6] - then pick top 2
- 2nd place cluster [3,4,7] - then pick winner

That gives 3/4 to proceed, and the last is 5 who won his group alone and is guaranteed through.

#### Require top 2
Then only need to break the 2nd place cluster, because we know 5 is one of the top 2.

#### Require top 3 (silly case)
The stupid case where we requested a non-multiple of the number of groups. In this case we need to distinguish the top 4, so we break as if we wanted top 4, then:

- Break between clusters: 2nd placers from [1,2,6] and 1st placers from [3,4,7]

The winner of this will be 3rd.

Note that you probably should never do this. Picking a multiple of the number of groups is always the most sensible approach. Besides, the tournaments you will pipe the top `n` to will take care of the extra matches required anyway.

## Usage
### Creation
Unlike every other tournament type, this tournament CAN NOT be created directly. It needs a finished tournament instance to be created from, and the number of players we want to pick from this tournament:

```js
var gs = new GroupStage(8, 4);
// score gs here so that gs.isDone();

var tb = TieBreaker.from(gs, 3); // want the top 3
tb.matches;
[ { id: { s: 0, r: 1, m: 1 }, // group 1 tiebreaker
    p: [ 1, 2, 6 ] },
  { id: { s: 0, r: 1, m: 2 }, // group 2 tiebreaker
    p: [ 3, 4, 7 ] },
  { id: { s: 0, r: 2, m: 1 }, // between group tiebreaker
    p: [ 0, 0 ] } ] // will be filled in with [2nd from g1tb, 1st from g2tb]
```

This uses the example ties above. Different amount of players to pick means different matches - TieBreaker only breaks when required.

### Scoring
Like every other tournament.

### Viewing results
TODO: talk about pos demotion
TODO: talk about how we just modify the parent results object's positions

## License
MIT-Licensed. See LICENSE file for details.
