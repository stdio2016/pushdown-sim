function CFG(variables, terminals, start, productions) {
  this.variables = variables;
  this.start = start;
  this.productions = productions;
  this.buildGraph();
}

CFG.prototype.toString = function () {
  return this.productions.join('\n');
};

CFG.prototype.buildGraph = function () {
  for (var i = 0; i < this.variables.length; i++) {
    this.variables[i].id = i;
  }
  for (var i = 0; i < this.productions.length; i++) {
    var p = this.productions[i];
    p.from.productions.push(p);
    for (var j = 0; j < p.toVars.length; j++) {
      p.toVars[j].inProductions.push(p);
    }
  }
};

CFG.prototype.removeUnused = function () {
  var used = new Set();
  for (var i = 0; i < this.productions.length; i++) {
    var p = this.productions[i];
    var allTerms = true;
    for (var j = 0; j < p.toVars.length; j++) {
      if (typeof p.to[j] !== "string") {
        allTerms = false; break;
      }
    }
    if (allTerms) {
      used.add(p.from);
    }
  }
};

function CFGVariable(name) {
  this.name = name;
  this.id = 0;
  this.inProductions = [];
  this.productions = [];
}

function CFGProduction(from, to) {
  this.from = from;
  this.to = to;
  this.toVars = [];
  for (var i = 0; i < to.length; i++) {
    if (to instanceof CFGVariable && this.toVars.indexOf(to) == -1) {
      this.toVars.push(to);
    }
  }
}

CFGProduction.prototype.toString = function () {
  var buf = [this.from.name, "->"];
  for (var i = 0; i < this.to.length; i++) {
    if (this.to[i] instanceof CFGVariable) {
      buf.push(this.to[i].name);
    }
    else {
      buf.push("'" + this.to[i] + "'");
    }
  }
  if (this.to.length == 0) {
    buf.push("λ");
  }
  return buf.join(" ");
};
