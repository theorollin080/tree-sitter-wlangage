/**
 * Validates grammar.js syntax by mocking the tree-sitter DSL globals.
 * Use: node validate.js
 */
const rule  = x => x;
const token = x => ({ type: 'token',    value: x });
const seq   = (...a) => ({ type: 'seq',      members: a });
const choice= (...a) => ({ type: 'choice',   members: a });
const repeat= x => ({ type: 'repeat',   content: x });
const optional=x=> ({ type: 'optional', content: x });
const field = (n,x)=>({ type: 'field', name: n, content: x });
const alias = (x,n)=>({ type: 'alias', value: x, named: n });

const prec = Object.assign(
  (n, x) => ({ type: 'prec', value: n, content: x }),
  {
    left:  (n, x) => ({ type: 'prec.left',  value: n, content: x }),
    right: (n, x) => ({ type: 'prec.right', value: n, content: x }),
    dynamic: (n, x) => ({ type: 'prec.dynamic', value: n, content: x }),
  }
);

function grammar(spec) {
  const fakeDollar = new Proxy({}, {
    get: (_, prop) => ({ type: 'ref', name: prop }),
  });
  const rules = {};
  for (const [name, fn] of Object.entries(spec.rules)) {
    try {
      rules[name] = typeof fn === 'function' ? fn(fakeDollar) : fn;
    } catch (e) {
      console.error(`Rule "${name}" failed: ${e.message}`);
    }
  }
  return { name: spec.name, rules };
}

// Expose globals exactly as tree-sitter does
global.grammar  = grammar;
global.token    = token;
global.seq      = seq;
global.choice   = choice;
global.repeat   = repeat;
global.optional = optional;
global.field    = field;
global.alias    = alias;
global.prec     = prec;
global.blank    = () => ({ type: 'blank' });
global.nothing  = () => ({ type: 'nothing' });

try {
  const g = require('./grammar.js');
  const ruleCount = Object.keys(g.rules).length;
  console.log(`\ngrammar.js OK — ${ruleCount} rules defined for language "${g.name}"`);
  console.log('Rules:', Object.keys(g.rules).join(', '));
  process.exit(0);
} catch (e) {
  console.error('\ngrammar.js ERREUR:', e.message);
  process.exit(1);
}
