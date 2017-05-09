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

function PDA(transitions, start, startStack, finalStates){
  this.transitions = transitions;
  this.start = start;
  this.startStack = startStack;
  this.finalStates = finalStates;
};

PDA.parse = function (str) {
  var f = str.split('\n');
  var g = [];
  var start = "q0";
  var startStack = "z";
  var finalStates = ["qF"];
  for (var i=0;i<f.length;i++) {
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
      var t = f[i].match(/^([^,]*),\s*('.'|[^,\s]?)\s*,([^,]*),([^,]*),(.*)$/);
      if (!t) {
        throw new SyntaxError("Transition format error");
        break;
      }
      var state = stringTrim(t[1]);
      var input = t[2];
      if (input.charAt(0) == "'") {
        input = input.charAt(1);
      }
      var stackTop = stringTrim(t[3]);
      var nextState = stringTrim(t[4]);
      var rewrite = stringTrim(t[5]).split(/\s+/);
      if(rewrite[0] == '') rewrite = [];
      
      var legalName = /^[a-zA-Z0-9_]+$/;
      if (!legalName.test(state)) {
        throw new SyntaxError("State name is illegal");
      }
      if (!legalName.test(stackTop)) {
        throw new SyntaxError("Stack symbol name is illegal");
      }
      for (var j = 0; i<rewrite.length; j++) {
        if (!legalName.test(rewrite[j])) {
          throw new SyntaxError("Stack symbol name is illegal");
        }
      }
      g.push(new PDATransition(state, input, stackTop, nextState, rewrite));
    }
  }
  return new PDA(g, start, startStack, finalStates);
};

