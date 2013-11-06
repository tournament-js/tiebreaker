var test = require('tap').test
  , $ = require('interlude')
  , GroupStage = require('groupstage')
  , TieBreaker = require('../');

// res filter
var inGrp = function (g) {
  return function (r) {
    return r.grp === g;
  };
};

var makeStr = function (r) {
  var str = "P" + r.seed + " WDL=" + r.wins + ',' + r.draws + ',' + r.losses;
  str += " F=" + r.for + " A=" + r.against;
  str += " => GPOS=" + r.gpos + " in grp " + r.grp + " @pos=" + r.pos;
  return str;
};

test("8 4 with 2x three-way tie results", function (t) {
  var gs = new GroupStage(8, { groupSize: 4 });

  gs.matches.forEach(function (m) {
    if (m.id.s === 1) {
      gs.score(m.id, (m.id.r === 1) ? [1,0] : [0, 1]);
    }
    if (m.id.s === 2) {
      gs.score(m.id, ([4].indexOf(m.id.r) >= 0) ? [1, 0] : [0, 1]);
    }
  });
  // => three way tie in group 1 ([3],[1,6,8],[],[])
  // => three way tie in group 2 ([4,5,7],[],[],[2])

  var res = gs.results();
  t.deepEqual(res.map(makeStr), [
      "P3 WDL=3,0,0 F=3 A=0 => GPOS=1 in grp 1 @pos=1",
      "P4 WDL=2,0,1 F=2 A=1 => GPOS=1 in grp 2 @pos=2",
      "P5 WDL=2,0,1 F=2 A=1 => GPOS=1 in grp 2 @pos=2",
      "P7 WDL=2,0,1 F=2 A=1 => GPOS=1 in grp 2 @pos=2",
      "P1 WDL=1,0,2 F=1 A=2 => GPOS=2 in grp 1 @pos=5",
      "P6 WDL=1,0,2 F=1 A=2 => GPOS=2 in grp 1 @pos=5",
      "P8 WDL=1,0,2 F=1 A=2 => GPOS=2 in grp 1 @pos=5",
      "P2 WDL=0,0,3 F=0 A=3 => GPOS=4 in grp 2 @pos=8"
    ],
    'gs results'
  );

  var grp1 = res.filter(inGrp(1));
  var grp2 = res.filter(inGrp(2));


  var tb = TieBreaker.from(gs, 5);
  var tms = tb.matches;
  t.equal(tms.length, 3, "3 tbs necessary for this");
  t.equal(tms[2].id.r, 2, "and last is the between tb");
  t.equal(tms[2].p.length, 2, "which will contain exactly 2 players");
  t.equal(tms[0].p.length, 3, "r1m1 will contain exactly 3 players");
  t.equal(tms[1].p.length, 3, "r1m2 will contain exactly 3 players");

  // pre start results
  var resInit = tb.results();
  t.deepEqual(resInit.map(makeStr), [
      "P3 WDL=3,0,0 F=3 A=0 => GPOS=1 in grp 1 @pos=1",
      "P4 WDL=2,0,1 F=2 A=1 => GPOS=1 in grp 2 @pos=7",
      "P5 WDL=2,0,1 F=2 A=1 => GPOS=1 in grp 2 @pos=7",
      "P7 WDL=2,0,1 F=2 A=1 => GPOS=1 in grp 2 @pos=7",
      "P1 WDL=1,0,2 F=1 A=2 => GPOS=2 in grp 1 @pos=7",
      "P6 WDL=1,0,2 F=1 A=2 => GPOS=2 in grp 1 @pos=7",
      "P8 WDL=1,0,2 F=1 A=2 => GPOS=2 in grp 1 @pos=7",
      "P2 WDL=0,0,3 F=0 A=3 => GPOS=4 in grp 2 @pos=8"
    ],
    'tb init results'
  );
  t.deepEqual(tb.players(), [1,4,5,6,7,8], '3way tied players in tb');

  var seventhPlacers = tb.results().filter(function (r) {
    return r.pos === 7;
  });

  t.equal(seventhPlacers.length, tb.players().length, 'all tb pls tied');

  tb.score(tms[0].id, [3,2,1]);
  t.deepEqual(tms[0].p, [1,6,8], 'group 1 tiebreaker players');

  //var resEarly = tb.results();
  //t.deepEqual(resEarly.map(makeStr), [
  //    "P3 WDL=3,0,0 F=3 A=0 => GPOS=1 in grp 1 @pos=1",
  //    "P4 WDL=2,0,1 F=2 A=1 => GPOS=1 in grp 2 @pos=7",
  //    "P5 WDL=2,0,1 F=2 A=1 => GPOS=1 in grp 2 @pos=7",
  //    "P7 WDL=2,0,1 F=2 A=1 => GPOS=1 in grp 2 @pos=7",
  //    "P1 WDL=1,0,2 F=1 A=2 => GPOS=2 in grp 1 @pos=7",
  //    "P6 WDL=1,0,2 F=1 A=2 => GPOS=3 in grp 1 @pos=7",
  //    "P8 WDL=1,0,2 F=1 A=2 => GPOS=4 in grp 1 @pos=7",
  //    "P2 WDL=0,0,3 F=0 A=3 => GPOS=4 in grp 2 @pos=8",
  //  ],
  //  'early results (after 1 match)'
  //);

  t.end();
  return;


  tb.score(tms[1].id, [3,2,1]);
  t.deepEqual(tms[1].p, [4,5,7], 'group 2 tiebreaker players');

  var resR1 = tb.results();
  t.deepEqual(resR1.map(makeStr), [
      "P3 WDL=3,0,0 F=3 A=0 => GPOS=1 in grp 1",
      "P4 WDL=2,0,1 F=2 A=1 => GPOS=1 in grp 2",
      "P5 WDL=2,0,1 F=2 A=1 => GPOS=2 in grp 2",
      "P1 WDL=1,0,2 F=1 A=2 => GPOS=2 in grp 1",
      "P7 WDL=2,0,1 F=2 A=1 => GPOS=3 in grp 2",
      "P6 WDL=1,0,2 F=1 A=2 => GPOS=3 in grp 1",
      "P8 WDL=1,0,2 F=1 A=2 => GPOS=4 in grp 1",
      "P2 WDL=0,0,3 F=0 A=3 => GPOS=4 in grp 2"
    ],
    'r1 results'
  );
  t.end();
  return;


  var grp1r1 = resR1.filter(inGrp(1));
  var grp2r1 = resR1.filter(inGrp(2));
  t.deepEqual($.pluck('gpos', grp1r1), [1,2,3,4], "group 1 resolved");
  t.deepEqual($.pluck('gpos', grp2r1), [1,2,3,4], "group 2 resolved");
  // so clearly not deepEqual to resBackup anymore!

  t.end();
  return;

  t.deepEqual($.pluck('pos', resR1), [1,2,3,4, 5,5, 7,8], "r2 cluster still tied!");
  t.deepEqual($.pluck('seed', resR1), [3,4,5,1, 7,6, 8,2], "and order correct");

  t.ok(!tb.isDone(), "not done yet");
  tb.score(tms[2].id, [2,1]); // 6 beats 7
  t.ok(tb.isDone(), "now done!");

  var resR2 = tb.results();
  t.deepEqual($.pluck('pos', resR2), [1,2,3,4, 5,6, 7,8], "r2 cluster resolved");
  t.deepEqual($.pluck('seed', resR2), [3,4,5,1, 6,7, 8,2], "and order correct");
  t.end();
});

return;


test("8 4 with 2x three-way tie results - different limits", function (t) {
  var gs = new GroupStage(8, 4);

  // scored as above - dont modify!
  gs.matches.forEach(function (m) {
    if (m.id.s === 1) {
      gs.score(m.id, (m.id.r === 1) ? [1,0] : [0, 1]);
    }
    if (m.id.s === 2) {
      gs.score(m.id, ([4].indexOf(m.id.r) >= 0) ? [1, 0] : [0, 1]);
    }
  });

  var res = gs.results();

  var verifyWith2 = function () {
    var tb = new TieBreaker(res, 2);
    var tms = tb.matches;
    t.equal(tms.length, 1, "1 tb necessary for this");
    t.equal(tms[0].p.length, 3, "r1m1 will contain exactly 3 players");
    t.equal(tms[0].id.r, 1, "match 1 in r1");
    t.deepEqual(tms[0].p, [4,5,7], "and it corr. to the group with 3way 1st");
    // three-way 2nd placer group does not need to be broken with limit 2!

    tb.score(tms[0].id, [3,2,1]);

    var resR1 = tb.results();
    var grp1r1 = resR1.filter(inGrp(1));
    var grp2r1 = resR1.filter(inGrp(2));
    t.deepEqual($.pluck('gpos', grp1r1), [1,2,2,2], "group 1 unresolved");
    t.deepEqual($.pluck('gpos', grp2r1), [1,2,3,4], "group 2 resolved");


    t.deepEqual($.pluck('pos', resR1), [1,2, 3,4,4,4, 7,8], "resolved only 3");
    t.deepEqual($.pluck('seed', resR1), [3,4, 5,1,6,8, 7,2], "and order correct");
    // this is a bit silly
    // players 7 had 6 points, but because he was broken last in the TB
    // he is a 3rd placers, and 5,1,6,8 are all 2nd placers => 7 below
    // had the other group been tiebroken, he would have scored higher
    // but such is the nature of the beast

    t.ok(tb.isDone(), "done");
  };
  verifyWith2();

  var verifyWith3 = function () {
    t.ok(TieBreaker.isNecessary(res, 3), "must break this");
    var tb = new TieBreaker(res, 3);
    var tms = tb.matches;
    t.equal(tms.length, 3, "3 tbs necessary for this");
    t.equal(tms[0].p.length, 3, "r1m1 will contain exactly 3 players");
    t.equal(tms[0].id.r, 1, "match 1 in r1");
    t.deepEqual(tms[0].p, [1,6,8], "and it corr. to the group with 3way 1st");

    t.equal(tms[1].p.length, 3, "r1m2 will contain exactly 3 players");
    t.equal(tms[1].id.r, 1, "match 2 in r1");
    t.deepEqual(tms[1].p, [4,5,7], "and it corr. to the group with 3way 2nd");


    t.equal(tms[2].p.length, 2, "r2m1 will contain exactly 2 players");
    t.equal(tms[2].id.r, 2, "match 2 in r2");
    t.deepEqual(tms[2].p, [0,0], "r2 not ready yet");

    tb.score(tms[0].id, [3,2,1]);
    tb.score(tms[1].id, [3,2,1]);
    t.deepEqual(tms[2].p, [1,5], "r2 propagated from r1");

    var resR1 = tb.results();
    var grp1r1 = resR1.filter(inGrp(1));
    var grp2r1 = resR1.filter(inGrp(2));
    t.deepEqual($.pluck('gpos', grp1r1), [1,2,3,4], "group 1 resolved");
    t.deepEqual($.pluck('gpos', grp2r1), [1,2,3,4], "group 2 resolved");
    // 1 and 5 still undecided
    t.deepEqual($.pluck('pos', resR1), [1,2, 3,3, 5,6,7,8], "unresolved R2");
    t.deepEqual($.pluck('seed', resR1), [3,4, 5,1, 7,6,8,2], "5 had more pts");

    tb.score(tms[2].id, [2,1]);
    var resR2 = tb.results();
    t.deepEqual($.pluck('pos', resR2), [1,2,3,4,5,6,7,8], "resolved everything");
    // important here is that 1 beats 5 for 3rd because of R2!
    t.deepEqual($.pluck('seed', resR2), [3,4, 1,5, 7,6,8,2], "and order correct");

  };
  verifyWith3();

  var verifyWith4 = function () {
    var tb = new TieBreaker(res, 4);
    var tms = tb.matches;
    t.equal(tms.length, 2, "2 tbs necessary for this");
    t.equal(tms[0].p.length, 3, "r1m1 will contain exactly 3 players");
    t.equal(tms[1].p.length, 3, "r1m2 will contain exactly 3 players");
    t.equal(tms[0].id.r, 1, "match 1 in r1");
    t.equal(tms[1].id.r, 1, "match 2 in r1");

    tb.score(tms[0].id, [3,2,1]);
    tb.score(tms[1].id, [3,2,1]);

    var resR1 = tb.results();
    var grp1r1 = resR1.filter(inGrp(1));
    var grp2r1 = resR1.filter(inGrp(2));
    t.deepEqual($.pluck('gpos', grp1r1), [1,2,3,4], "group 1 resolved");
    t.deepEqual($.pluck('gpos', grp2r1), [1,2,3,4], "group 2 resolved");

    t.deepEqual($.pluck('pos', resR1), [1,2,3,4, 5,6, 7,8], "r2 cluster not tied!");
    t.deepEqual($.pluck('seed', resR1), [3,4,5,1, 7,6, 8,2], "and order correct");

    t.ok(tb.isDone(), "done");
  };
  verifyWith4();

  var verifyWith5 = function () {
    var tb = new TieBreaker(res, 5);
    var tms = tb.matches;
    t.equal(tms.length, 3, "3 tbs necessary for this");
    t.equal(tms[0].p.length, 3, "r1m1 will contain exactly 3 players");
    t.equal(tms[0].id.r, 1, "match 1 in r1");
    t.deepEqual(tms[0].p, [1,6,8], "and it corr. to the group with 3way 1st");

    t.equal(tms[1].p.length, 3, "r1m2 will contain exactly 3 players");
    t.equal(tms[1].id.r, 1, "match 2 in r1");
    t.deepEqual(tms[1].p, [4,5,7], "and it corr. to the group with 3way 2nd");


    t.equal(tms[2].p.length, 2, "r2m1 will contain exactly 2 players");
    t.equal(tms[2].id.r, 2, "match 2 in r2");
    t.deepEqual(tms[2].p, [0,0], "r2 not ready yet");

    tb.score(tms[0].id, [3,2,1]);
    tb.score(tms[1].id, [3,2,1]);
    t.deepEqual(tms[2].p, [6,7], "r2 propagated from r1");

    var resR1 = tb.results();
    var grp1r1 = resR1.filter(inGrp(1));
    var grp2r1 = resR1.filter(inGrp(2));
    t.deepEqual($.pluck('gpos', grp1r1), [1,2,3,4], "group 1 resolved");
    t.deepEqual($.pluck('gpos', grp2r1), [1,2,3,4], "group 2 resolved");
    // 1 and 5 still undecided
    t.deepEqual($.pluck('pos', resR1), [1,2,3,4, 5,5, 7,8], "unresolved R2");
    t.deepEqual($.pluck('seed', resR1), [3,4,5,1, 7,6, 8,2], "5 had more pts");

    tb.score(tms[2].id, [2,1]);
    var resR2 = tb.results();
    t.deepEqual($.pluck('pos', resR2), [1,2,3,4,5,6,7,8], "resolved everything");
    // important here is that 6 beats 7 for 3rd because of R2!
    t.deepEqual($.pluck('seed', resR2), [3,4,5,1, 6,7, 8,2], "and order correct");
  };
  verifyWith5();


  var verifyWith6 = function () {
    var tb = new TieBreaker(res, 6);
    var tms = tb.matches;
    t.equal(tms.length, 1, "1 tbs necessary for this");
    t.equal(tms[0].p.length, 3, "r1m1 will contain exactly 3 players");
    t.equal(tms[0].id.r, 1, "match 1 in r1");
    t.deepEqual(tms[0].p, [1,6,8], "and it corr. to the group with 3way 1st");

    tb.score(tms[0].id, [3,2,1]);

    var resR1 = tb.results();
    var grp1r1 = resR1.filter(inGrp(1));
    var grp2r1 = resR1.filter(inGrp(2));
    t.deepEqual($.pluck('gpos', grp1r1), [1,2,3,4], "group 1 resolved");
    t.deepEqual($.pluck('gpos', grp2r1), [1,1,1,4], "group 2 unresolved");
    // group 2 breaking was unnecessary - so we just pick top 3 from each after r1
    t.deepEqual($.pluck('pos', resR1), [1,2,2,2,5,6, 7,8], "unresolved g2");
    t.deepEqual($.pluck('seed', resR1), [3,4,5,7,1,6, 8,2], "point sorted-ish");
  };
  verifyWith6();

  var verifyWith7 = function () {
    var tb = new TieBreaker(res, 7);
    var tms = tb.matches;
    t.equal(tms.length, 2, "2 tbs necessary for this");
    t.equal(tms[0].p.length, 3, "r1m1 will contain exactly 3 players");
    t.equal(tms[0].id.r, 1, "match 1 in r1");
    t.deepEqual(tms[0].p, [1,6,8], "and it corr. to the group with 3way 1st");

    t.equal(tms[1].p.length, 2, "r2m1 will contain exactly 2 players");
    t.equal(tms[1].id.r, 2, "match 2 in r2");
    t.deepEqual(tms[1].p, [0,0], "r2 not ready yet");

    tb.score(tms[0].id, [3,2,1]);
    t.deepEqual(tms[1].p, [2,8], "r2 propagated from r1");

    var resR1 = tb.results();
    var grp1r1 = resR1.filter(inGrp(1));
    var grp2r1 = resR1.filter(inGrp(2));
    t.deepEqual($.pluck('gpos', grp1r1), [1,2,3,4], "group 1 resolved");
    t.deepEqual($.pluck('gpos', grp2r1), [1,1,1,4], "group 2 unresolved");
    // 8 and 2 undecided + group 2 breaking was unnecessary
    t.deepEqual($.pluck('pos', resR1), [1,2,2,2, 5,6, 7,7], "unresolved R2");
    t.deepEqual($.pluck('seed', resR1), [3,4,5,7, 1,6, 8,2], "point sorted-ish");

    tb.score(tms[1].id, [2,1]);
    var resR2 = tb.results();
    t.deepEqual($.pluck('pos', resR2), [1,2,2,2, 5,6, 7,8], "resolved last");
    // important here is that 2 beats 8 for 3rd because of R2!
    t.deepEqual($.pluck('seed', resR2), [3,4,5,7, 1,6, 2,8], "and order correct");
  };
  verifyWith7();

  t.end();
});

