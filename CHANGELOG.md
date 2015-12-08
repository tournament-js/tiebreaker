3.1.0 / 2015-12-08
==================
  * Bump tournament to 3.1.1 for configurable logging
  * Bump groupstage and ffa as well for same functionality there
  * Expose `Id` class like the other tournaments

3.0.0 / 2014-10-11
==================
  * Bump tournament to 3.0.0 for better serialization via `::state` and `.restore`
  * Similarly bump groupstage while we are at it

2.1.0 / 2014-10-03
==================
  * Implement `_safe` for better `unscorable` check for safe history rewrites
  * Bump tournament to 2.2.0 for `_safe`
  * Bump groupstage to 2.1.0 for `GroupStage::safe`

2.0.1 / 2014-09-30
==================
  * Bump tournament to 2.0.1
  * Bump interlude to 1.1.0
  * Bump groupstage to 2.0.1

2.0.0 / 2014-09-14
==================
  * **BREAKING** Bump tournament to 2.0.0 for more sensible `Tournament::upcoming`
  * No longer modifying input in `TieBreaker.defaults` (bug)

1.0.0 / 2014-09-03
==================
  * Remove `idString` but provide a `toString` function for match ids natively
  * Remove hidden `::rep` from prototype
  * toString now gives a simpler match id and excludes "R1 M1" in non-grouped
  * Bump to tournament 1.0.0

0.4.1 / 2014-08-03
==================
  * Documentation and coverage

0.4.0 / 2013-12-23
==================
  * Updated `tournament` to 0.21.0 so that `TieBreaker` is an `EventEmitter`
  * Added `.name` property on instance for tourney implementations

0.3.0 / 2013-11-26
==================
  * Changed `nonStrict` to `strict`, so default is now `strict: false`
  * Added `breakForBetween` flag to allow breaking one level up - issue #2

0.2.1 / 2013-11-24
==================
  * Fixed a bug in `grouped` tiebreakers that 2 player subgroups to fail
  * bumped groupstage module to get this newly allowed 2 player functionality
  * bump tournament to fix a bug that made grouped mode to fail when having differntly sized sub groups
  * add static `isNecessary` function again

0.2.0 / 2013-11-23
==================
  * REMOVED BETWEEN SECTION TIEBREAKERS:
    - Impossible to do in the same stage as within stage subgrouped tiebreakers
    - But can implement this specific feature in a separate module
  * Added `grouped` tiebreaker mode!
  * New `id` convention:
    - `s` - the section corresponding to the section we are breaking
    - `r` - the round in this within section breaker
    - `m` - the match in this within section breaker round

0.1.1 / 2013-11-16
==================
  * Add `nonStrict` mode support where `TieBreaker` matches can tie, or be partially resolved (which may mean you have to tiebreak more than once)

0.1.0 / 2013-11-14
==================
  * first tentative release - factored out of groupstage 0.4.0 and hammered until independent and good
  * lots of fixes and improvements since then: demotion algorithm, positioning, generality
  * initialization uses a specialized `.from` that makes everything work under the covers
  * other tournament can indicate compatibility by implementing ::rawPositions and we will break on them when needed
