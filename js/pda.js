function stringTrim(str) {
  return str.replace(/^\s+|\s+$/g, "");
}

function PDATransition(state, input, stackTop, nextState, rewrite){
  this.state = state;
  this.input = input;
  this.stackTop = stackTop;
  this.nextState = nextState;
  this.rewrite = rewrite;
};

PDATransition.prototype.toString = function () {
  var ch, rewrite = this.rewrite.join(" ");
  if (this.input == "") {
    ch = "λ";
  }
  else {
    ch = "'" + this.input + "'";
  }
  if (this.rewrite.length == 0) {
    rewrite = "λ";
  }
  return this.state + "," + ch + "," + this.stackTop + "," +
    this.nextState + "," + rewrite;
};

function PDA(transitions, start, startStack, finalStates){
  this.transitions = transitions;
  this.start = start;
  this.startStack = startStack;
  this.finalStates = finalStates;
};

function GenSym(name){
  this.name = name;
  this.id = ++GenSym.id;
}

GenSym.id = 0;
GenSym.prototype.toString = function () {
  return "[gensym " + this.name + " " + this.id + "]";
};

PDA.parse = function (str) {
  var f = str.split('\n');
  var g = [];
  var start = "q0";
  var startStack = "z";
  var finalStates = ["qF"];
  for (var i=0;i<f.length;i++) {
    // skip comment
    if (/^\s*(?:;.*)?$/.test(f[i])) continue;
    var s = f[i].match(/^\s*([^=]*)= (.*)$/);
    if(s){
      var tag = stringTrim(s[1]);
      if (tag == "start") {
        start = stringTrim(s[2]);
      }
      if (tag == "stack") {
        startStack = stringTrim(s[2]);
      }
      if (tag == "final") {
        finalStates = stringTrim(s[2]).split(/\s+/);
        if(finalStates[0] == '') finalStates = [];
      }
    }
    else {
      var t = f[i].match(/^([^,]*),\s*('.'|[^,\s]?|lambda)\s*,([^,]*),([^,]*),(.*)$/);
      if (!t) {
        throw new SyntaxError("Transition format error");
        break;
      }
      var state = stringTrim(t[1]);
      var input = t[2];
      if (input.charAt(0) == "'") {
        input = input.charAt(1);
      }
      else if (input == "λ" || input == "lambda") { // lambda
        input = "";
      }
      var stackTop = stringTrim(t[3]);
      var nextState = stringTrim(t[4]);
      var rewrite = stringTrim(t[5]).split(/\s+/);
      if(rewrite[0] == '' || rewrite[0] == "λ") rewrite = [];

      var legalName = /^[a-zA-Z0-9_]+$/;
      if (!legalName.test(state)) {
        throw new SyntaxError("State name is illegal");
      }
      if (!legalName.test(stackTop)) {
        throw new SyntaxError("Stack symbol name is illegal");
      }
      for (var j = 0; j<rewrite.length; j++) {
        if (!legalName.test(rewrite[j])) {
          throw new SyntaxError("Stack symbol name is illegal");
        }
      }
      g.push(new PDATransition(state, input, stackTop, nextState, rewrite));
    }
  }
  return new PDA(g, start, startStack, finalStates);
};

PDA.prototype.toString = function() {
  var tos = [
    "start = " + this.start,
    "stack = " + this.startStack,
    "final = " + this.finalStates.join(' ')
  ].concat(this.transitions);
  return tos.join('\n');
};

PDA.prototype.normalizeBin = function () {
  var trans = [];
  for (var i=0; i<this.transitions.length; i++){
    var t = this.transitions[i];
    if (t.rewrite.length == 0 || t.rewrite.length == 2) {
      // (qi,a,A) -> (qj,BC) or (qj,lambda)
      trans.push(t);
    }
    else if (t.rewrite.length == 1) { // (qi,a,A)->(qj,B)
      var gen = new GenSym(t.state);
      trans.push(new PDATransition(t.state, t.input, t.stackTop, t.state, [gen, t.rewrite[0]]));
      trans.push(new PDATransition(t.state, "", gen, t.nextState, []));
    }
    else { // (qi,a,A) -> (qj,BCDE...)
      var gen = new GenSym(t.state);
      trans.push(new PDATransition(t.state, "", gen, t.nextState, [t.rewrite[0], t.rewrite[1]]));
      for (var k = 2; k < t.rewrite.length - 1; k++) {
        var gen2 = new GenSym(t.state);
        trans.push(new PDATransition(t.state, "", gen2, t.state, [gen, t.rewrite[k]]));
        gen = gen2;
      }
      trans.push(new PDATransition(t.state, t.input, t.stackTop, t.state, [gen, t.rewrite[t.rewrite.length-1]]));
    }
  }
  return new PDA(trans, this.start, this.startStack, this.finalStates);
};

PDA.prototype.getStates = function () {
  var s = new Set();
  s.add(this.start);
  for (var i = 0; i < this.transitions.length; i++) {
    s.add(this.transitions[i].state).add(this.transitions[i].nextState);
  }
  return s;
};

PDA.prototype.getStackSymbols = function () {
  var s = new Set();
  s.add(this.startStack);
  for (var i = 0; i < this.transitions.length; i++) {
    var t = this.transitions[i];
    s.add(t.stackTop);
    for (var j = 0; j < t.rewrite.length; j++) {
      s.add(t.rewrite[j]);
    }
  }
  return s;
};

PDA.prototype.normalizeForSim = function () {
  var pda = this.normalizeBin();
  var trans = [];
  var start = new GenSym("qStart");
  var startStack = new GenSym("s0");
  trans.push(new PDATransition(start, "", startStack, this.start, [this.startStack, startStack]));
  var states = this.getStates();
  var symbols = this.getStackSymbols();
  var finals = [];
  states.forEach(function (q) {
    var qDebug = new GenSym(q + " D");
    var qFinal = new GenSym(q + " F");
    finals.push(qFinal);
    symbols.forEach(function (s) {
      trans.push(new PDATransition(q, "", s, qDebug, []));
      trans.push(new PDATransition(qDebug, "", s, qDebug, []));
    });
    trans.push(new PDATransition(qDebug, "", startStack, qFinal, []));
    trans.push(new PDATransition(q, "", startStack, qFinal, []));
  });
  return new PDA(pda.transitions.concat(trans), start, startStack, finals);
};

// You need to normalize PDA before converting to CFG
PDA.prototype.pda2cfg = function () {
  var states = this.getStates();
  var stateIds = new Map(); // state -> state id
  var i = 0;
  var stateArr = []; // state id -> state
  states.forEach(function (q) {
    stateIds.set(q, i);
    stateArr.push(q);
    ++i;
  });
  var syms = this.getStackSymbols();
  var symIds = new Map(); // stack symbol -> symbol id
  var symArr = []; // symbol id -> stack symbol
  i = 0;
  syms.forEach(function (s) {
    symIds.set(s, i);
    symArr.push(s);
    ++i;
  });
  var stateCount = states.size, symCount = syms.size;
  var variables = new Map(); // var id -> CFG variable
  function getVar(qi, A, qj) {
    var id = (qi * symCount + A) * stateCount + qj;
    var V = variables.get(id);
    if (V) return V;
    V = new CFGVariable(stateArr[qi] + "," + symArr[A] + "," + stateArr[qj]);
    variables.set(id, V);
    return V;
  }
  var prods = [];
  for (var i = 0; i < this.transitions.length; i++) {
    var t = this.transitions[i];
    var qi = stateIds.get(t.state), qj = stateIds.get(t.nextState);
    var A = symIds.get(t.stackTop);
    if (t.rewrite.length == 0) {
      // (qiAqj) -> a
      var payload = null;
      if (t.nextState instanceof GenSym && / D$/.test(t.nextState.name)) {
        payload = t.stackTop.toString();
      }
      var V = getVar(qi, A, qj);
      if (t.input === "") {
        prods.push(new CFGProduction(V, [], payload));
      }
      else {
        prods.push(new CFGProduction(V, [t.input], payload));
      }
    }
    else if (t.rewrite.length == 2) {
      // for each qk,ql, (qiAqk) -> a (qjBqk) (qkCql)
      var B = symIds.get(t.rewrite[0]), C = symIds.get(t.rewrite[1]);
      for (var qk = 0; qk < stateCount; qk++) {
        for (var ql = 0; ql < stateCount; ql++) {
          var V = getVar(qi, A, qk);
          var V1 = getVar(qj, B, ql), V2 = getVar(ql, C, qk);
          if (t.input === "") {
            prods.push(new CFGProduction(V, [V1, V2]));
          }
          else {
            prods.push(new CFGProduction(V, [t.input, V1, V2]));
          }
        }
      }
    }
    else {
      // this PDA is not normalized
      throw new TypeError("This PDA is not normalized");
    }
  }
  var vs = [];
  var S = getVar(stateIds.get(this.start), symIds.get(this.startStack), stateIds.get(this.finalStates[0]));
  variables.forEach(function (V) {
    vs.push(V);
  });
  return new CFG(vs, [], S, prods);
};
