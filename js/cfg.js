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
  var used = []; // set of variables
  for (var i = 0; i < this.variables.length; i++) {
    this.variables[i].mark = false;
  }
  for (var i = 0; i < this.productions.length; i++) {
    var p = this.productions[i];
    if (p.toVars.length == 0 && !p.from.mark) {
      used.push(p.from);
      p.from.mark = true;
    }
    p.markCount = 0;
  }
  for (var i = 0; i < used.length; i++) {
    for (var j = 0; j < used[i].inProductions.length; j++) {
      var p = used[i].inProductions[j];
      p.markCount++;
      if (p.toVars.length == p.markCount && !p.from.mark) {
        used.push(p.from);
        p.from.mark = true;
      }
    }
  }
  var newP = [];
  for (var i = 0; i < this.productions.length; i++) {
    var p = this.productions[i];
    if (p.toVars.length == p.markCount) {
      newP.push(p);
    }
  }
  this.variables = used;
  this.productions = newP;
};

function CFGVariable(name) {
  this.name = name;
  this.id = 0;
  this.inProductions = [];
  this.productions = [];
  this.mark = false;
}

function CFGProduction(from, to) {
  this.from = from;
  this.to = to;
  this.toVars = [];
  for (var i = 0; i < to.length; i++) {
    if (to[i] instanceof CFGVariable && this.toVars.indexOf(to[i]) == -1) {
      this.toVars.push(to[i]);
    }
  }
  this.markCount = 0;
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
