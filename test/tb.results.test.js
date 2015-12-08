var $ = require('interlude')
  , GroupStage = require('groupstage')
  , TieBreaker = require('..')
  , test = require('bandage');

var makeStr = function (r) {
  var str = 'P' + r.seed + ' WDL=' + r.wins + ',' + r.draws + ',' + r.losses;
  str += ' F=' + r.for + ' A=' + r.against;
  str += ' => GPOS=' + r.gpos + ' in grp ' + r.grp + ' @pos=' + r.pos;
  return str;
};

test('doubleThreewayTiesResults', function *(t) {
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
    'P3 WDL=3,0,0 F=3 A=0 => GPOS=1 in grp 1 @pos=1',
    'P4 WDL=2,0,1 F=2 A=1 => GPOS=1 in grp 2 @pos=1',
    'P5 WDL=2,0,1 F=2 A=1 => GPOS=1 in grp 2 @pos=1',
    'P7 WDL=2,0,1 F=2 A=1 => GPOS=1 in grp 2 @pos=1',
    'P1 WDL=1,0,2 F=1 A=2 => GPOS=2 in grp 1 @pos=5',
    'P6 WDL=1,0,2 F=1 A=2 => GPOS=2 in grp 1 @pos=5',
    'P8 WDL=1,0,2 F=1 A=2 => GPOS=2 in grp 1 @pos=5',
    'P2 WDL=0,0,3 F=0 A=3 => GPOS=4 in grp 2 @pos=8',],
    'gs results'
  );

  var tb = TieBreaker.from(gs, 4);
  var tms = tb.matches;
  t.equal(tms.length, 2, '2 tbs necessary for this');
  t.equal(tms[0].p.length, 3, 's1m1 will contain exactly 3 players');
  t.equal(tms[1].p.length, 3, 's1m2 will contain exactly 3 players');

  // pre start results
  var resInit = tb.results();
  t.deepEqual(resInit.map(makeStr), [
    'P3 WDL=3,0,0 F=3 A=0 => GPOS=1 in grp 1 @pos=1',
    'P4 WDL=2,0,1 F=2 A=1 => GPOS=1 in grp 2 @pos=7',
    'P5 WDL=2,0,1 F=2 A=1 => GPOS=1 in grp 2 @pos=7',
    'P7 WDL=2,0,1 F=2 A=1 => GPOS=1 in grp 2 @pos=7',
    'P1 WDL=1,0,2 F=1 A=2 => GPOS=2 in grp 1 @pos=7',
    'P6 WDL=1,0,2 F=1 A=2 => GPOS=2 in grp 1 @pos=7',
    'P8 WDL=1,0,2 F=1 A=2 => GPOS=2 in grp 1 @pos=7',
    'P2 WDL=0,0,3 F=0 A=3 => GPOS=4 in grp 2 @pos=8',],
    'tb init results'
  );
  tb.score(tms[0].id, [3,2,1]);
  t.deepEqual(tms[0].p, [1,6,8], 'group 1 tiebreaker players');

  var resEarly = tb.results();
  t.deepEqual(resEarly.map(makeStr), [
    'P3 WDL=3,0,0 F=3 A=0 => GPOS=1 in grp 1 @pos=1', // orig winner
    'P4 WDL=2,0,1 F=2 A=1 => GPOS=1 in grp 2 @pos=7',
    'P5 WDL=2,0,1 F=2 A=1 => GPOS=1 in grp 2 @pos=7',
    'P7 WDL=2,0,1 F=2 A=1 => GPOS=1 in grp 2 @pos=7',
    'P1 WDL=1,0,2 F=1 A=2 => GPOS=2 in grp 1 @pos=7',
    'P6 WDL=1,0,2 F=1 A=2 => GPOS=3 in grp 1 @pos=7',
    'P8 WDL=1,0,2 F=1 A=2 => GPOS=4 in grp 1 @pos=7',
    'P2 WDL=0,0,3 F=0 A=3 => GPOS=4 in grp 2 @pos=8',], // orig loser
    'early results (after 1 match)'
  );


  tb.score(tms[1].id, [3,2,1]);
  t.deepEqual(tms[1].p, [4,5,7], 'group 2 tiebreaker players');

  t.ok(tb.isDone(), 'now done!');

  var resBetween = tb.results();
  t.deepEqual(resBetween.map(makeStr), [
    'P3 WDL=3,0,0 F=3 A=0 => GPOS=1 in grp 1 @pos=1',
    'P4 WDL=2,0,1 F=2 A=1 => GPOS=1 in grp 2 @pos=1',
    'P5 WDL=2,0,1 F=2 A=1 => GPOS=2 in grp 2 @pos=3',
    'P1 WDL=1,0,2 F=1 A=2 => GPOS=2 in grp 1 @pos=3',
    'P7 WDL=2,0,1 F=2 A=1 => GPOS=3 in grp 2 @pos=5',
    'P6 WDL=1,0,2 F=1 A=2 => GPOS=3 in grp 1 @pos=5',
    'P8 WDL=1,0,2 F=1 A=2 => GPOS=4 in grp 1 @pos=7',
    'P2 WDL=0,0,3 F=0 A=3 => GPOS=4 in grp 2 @pos=7',],
    'between results - pos ties resolved at limit point'
  );
});


test('doubleThreewayTiesLimits', function *(t) {
  var gs = new GroupStage(8, { groupSize: 4 });

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
  t.deepEqual(gs.rawPositions(res), [
    [[3],[1,6,8],[],[]],
    [[4,5,7],[],[],[2]] ],
    'gs positions'
  );
  t.deepEqual(res.map(makeStr), [
    'P3 WDL=3,0,0 F=3 A=0 => GPOS=1 in grp 1 @pos=1',
    'P4 WDL=2,0,1 F=2 A=1 => GPOS=1 in grp 2 @pos=1',
    'P5 WDL=2,0,1 F=2 A=1 => GPOS=1 in grp 2 @pos=1',
    'P7 WDL=2,0,1 F=2 A=1 => GPOS=1 in grp 2 @pos=1',
    'P1 WDL=1,0,2 F=1 A=2 => GPOS=2 in grp 1 @pos=5',
    'P6 WDL=1,0,2 F=1 A=2 => GPOS=2 in grp 1 @pos=5',
    'P8 WDL=1,0,2 F=1 A=2 => GPOS=2 in grp 1 @pos=5',
    'P2 WDL=0,0,3 F=0 A=3 => GPOS=4 in grp 2 @pos=8',],
    'gs results'
  );

  var verifyWith2 = function () {
    var tb = TieBreaker.from(gs, 2);
    var tms = tb.matches;
    t.equal(tms.length, 1, '1 tb necessary for this');
    t.equal(tms[0].id.s, 2, 'match 1 is for grp 2');
    t.deepEqual(tms[0].p, [4,5,7], 'and it corr. to the group with 3way 1st');
    // three-way 2nd placer group does not need to be broken with limit 2!

    tb.score(tms[0].id, [3,2,1]);
    t.ok(tb.isDone(), 'tiebreaker done');

    var resR1 = tb.results();
    t.deepEqual(resR1.map(makeStr), [
      'P3 WDL=3,0,0 F=3 A=0 => GPOS=1 in grp 1 @pos=1',
      'P4 WDL=2,0,1 F=2 A=1 => GPOS=1 in grp 2 @pos=1',
      'P5 WDL=2,0,1 F=2 A=1 => GPOS=2 in grp 2 @pos=3',
      'P1 WDL=1,0,2 F=1 A=2 => GPOS=2 in grp 1 @pos=3',
      'P6 WDL=1,0,2 F=1 A=2 => GPOS=2 in grp 1 @pos=3',
      'P8 WDL=1,0,2 F=1 A=2 => GPOS=2 in grp 1 @pos=3',
      'P7 WDL=2,0,1 F=2 A=1 => GPOS=3 in grp 2 @pos=7',
      'P2 WDL=0,0,3 F=0 A=3 => GPOS=4 in grp 2 @pos=8',],
      'resolved tb results'
    );
    // NB: this is a bit silly
    // players 7 had 6 points, but because he was broken last in the TB
    // he is a 3rd placer, and 5,1,6,8 are all 2nd placers => 7 below
    // had the other group been tiebroken, he would have scored higher
    // unfortunately, such is the nature of the beast

    t.ok(tb.isDone(), 'done');
  };
  verifyWith2();

  var verifyWith4 = function () {
    var tb = TieBreaker.from(gs, 4);
    var tms = tb.matches;
    t.equal(tms.length, 2, '2 tbs necessary for this');
    t.equal(tms[1].p.length, 3, 'r1m2 will contain exactly 3 players');
    t.equal(tms[0].id.s, 1, 's1 match');
    t.deepEqual(tms[0].p, [1,6,8], 'corr. to the group with 3way 2nds');
    tb.score(tms[0].id, [3,2,1]);
    t.equal(tms[1].id.s, 2, 's2 match');
    t.deepEqual(tms[1].p, [4,5,7], 'corr. to the group with 3way 1st');
    tb.score(tms[1].id, [3,2,1]);

    t.ok(tb.isDone(), 'done');
    var resR1 = tb.results();
    t.deepEqual(resR1.map(makeStr), [
      'P3 WDL=3,0,0 F=3 A=0 => GPOS=1 in grp 1 @pos=1',
      'P4 WDL=2,0,1 F=2 A=1 => GPOS=1 in grp 2 @pos=1',
      'P5 WDL=2,0,1 F=2 A=1 => GPOS=2 in grp 2 @pos=3',
      'P1 WDL=1,0,2 F=1 A=2 => GPOS=2 in grp 1 @pos=3',
      'P7 WDL=2,0,1 F=2 A=1 => GPOS=3 in grp 2 @pos=5',
      'P6 WDL=1,0,2 F=1 A=2 => GPOS=3 in grp 1 @pos=5',
      'P8 WDL=1,0,2 F=1 A=2 => GPOS=4 in grp 1 @pos=7',
      'P2 WDL=0,0,3 F=0 A=3 => GPOS=4 in grp 2 @pos=7',],
      'resolved tb results'
    );
  };
  verifyWith4();

  var verifyWith6 = function () {
    var tb = TieBreaker.from(gs, 6);
    var tms = tb.matches;
    t.equal(tms.length, 1, '1 tbs necessary for this');
    t.equal(tms[0].id.s, 1, 's1 breaker');
    t.deepEqual(tms[0].p, [1,6,8], 'corr. to the 3way 1st');
    tb.score(tms[0].id, [3,2,1]);

    t.ok(tb.isDone(), 'done');
    var resR1 = tb.results();
    t.deepEqual(resR1.map(makeStr), [
      'P3 WDL=3,0,0 F=3 A=0 => GPOS=1 in grp 1 @pos=1',
      'P4 WDL=2,0,1 F=2 A=1 => GPOS=1 in grp 2 @pos=1',
      'P5 WDL=2,0,1 F=2 A=1 => GPOS=1 in grp 2 @pos=1',
      'P7 WDL=2,0,1 F=2 A=1 => GPOS=1 in grp 2 @pos=1',
      'P1 WDL=1,0,2 F=1 A=2 => GPOS=2 in grp 1 @pos=5',
      'P6 WDL=1,0,2 F=1 A=2 => GPOS=3 in grp 1 @pos=6',
      'P8 WDL=1,0,2 F=1 A=2 => GPOS=4 in grp 1 @pos=7',
      'P2 WDL=0,0,3 F=0 A=3 => GPOS=4 in grp 2 @pos=7',],
      'resolved tb results'
    );
  };
  verifyWith6();
});

