0.1.1 / 2013-11-16
==================
  * Add `nonStrict` mode support where `TieBreaker` matches can tie, or be partially resolved (which may mean you have to tiebreak more than once)

0.1.0 / 2013-11-14
==================
  * first tentative release - factored out of groupstage 0.4.0 and hammered until independent and good
  * lots of fixes and improvements since then: demotion algorithm, positioning, generality
  * initialization uses a specialized `.from` that makes everything work under the covers
  * other tournament can indicate compatibility by implementing ::rawPositions and we will break on them when needed
