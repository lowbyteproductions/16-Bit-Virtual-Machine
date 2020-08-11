const A = require('arcsecond');
const T = require('./types');

const {
  peek,
  hexLiteral,
  operator,
  variable,
} = require('./common');

const disambiguateOrderOfOperations = expr => {
  if (expr.type !== 'SQUARE_BRACKET_EXPRESSION' && expr.type !== 'BRACKETED_EXPRESSION') {
    return expr;
  }

  if (expr.value.length === 1) {
    return expr.value[0];
  }

  const priorities = {
    OP_MULTIPLY: 2,
    OP_PLUS: 1,
    OP_MINUS: 0,
  };
  let candidateExpression = {
    priority: -Infinity
  };

  for (let i = 1; i < expr.value.length; i += 2) {
    const level = priorities[expr.value[i].type];
    if (level > candidateExpression.priority) {
      candidateExpression = {
        priority: level,
        a: i-1,
        b: i+1,
        op: expr.value[i]
      }
    }
  }

  const newExpression = T.bracketedExpression([
    ...expr.value.slice(0, candidateExpression.a),
    T.binaryOperation({
      a: disambiguateOrderOfOperations(expr.value[candidateExpression.a]),
      b: disambiguateOrderOfOperations(expr.value[candidateExpression.b]),
      op: candidateExpression.op
    }),
  ...expr.value.slice(candidateExpression.b + 1)
  ]);

  return disambiguateOrderOfOperations(newExpression);
}

const last = a => a[a.length-1];

const typifyBracketedExpression = expr => {
  return T.bracketedExpression(expr.map(element => {
    if (Array.isArray(element)) {
      return typifyBracketedExpression(element);
    }
    return element;
  }));
}

const bracketedExpr = A.coroutine(function* () {
  const states = {
    OPEN_BRACKET: 0,
    OPERATOR_OR_CLOSING_BRACKET: 1,
    ELEMENT_OR_OPENING_BRACKET: 2,
    CLOSE_BRACKET: 3
  };

  let state = states.ELEMENT_OR_OPENING_BRACKET;

  const expr = [];
  const stack = [expr];
  yield A.char('(');

  while (true) {
    const nextChar = yield peek;

    if (state === states.OPEN_BRACKET) {
      yield A.char('(');
      expr.push([]);
      stack.push(last(expr));
      yield A.optionalWhitespace;
      state = states.ELEMENT_OR_OPENING_BRACKET;
    } else if (state === states.CLOSE_BRACKET) {
      yield A.char(')');
      stack.pop();
      if (stack.length === 0) {
        // We've reached the end of the bracket expression
        break;
      }

      yield A.optionalWhitespace;
      state = states.OPERATOR_OR_CLOSING_BRACKET;
    } else if (state === states.ELEMENT_OR_OPENING_BRACKET) {
      if (nextChar === ')') {
        yield A.fail('Unexpected end of expression');
      }

      if (nextChar === '(') {
        state = states.OPEN_BRACKET;
      } else {
        last(stack).push(yield A.choice([
          hexLiteral,
          variable
        ]));
        yield A.optionalWhitespace;
        state = states.OPERATOR_OR_CLOSING_BRACKET;
      }
    } else if (state === states.OPERATOR_OR_CLOSING_BRACKET) {
      if (nextChar === ')') {
        state = states.CLOSE_BRACKET;
        continue;
      }

      last(stack).push(yield operator);
      yield A.optionalWhitespace;
      state = states.ELEMENT_OR_OPENING_BRACKET;
    } else {
      // This shouldn't happen!
      throw new Error('Unknown state');
    }

  }
  return typifyBracketedExpression(expr);
});

const squareBracketExpr = A.coroutine(function* () {
  yield A.char('[');
  yield A.optionalWhitespace;

  const states = {
    EXPECT_ELEMENT: 0,
    EXPECT_OPERATOR: 1,
  };

  const expr = [];
  let state = states.EXPECT_ELEMENT;

  while (true) {
    if (state === states.EXPECT_ELEMENT) {
      const result = yield A.choice([
        bracketedExpr,
        hexLiteral,
        variable
      ]);
      expr.push(result);
      state = states.EXPECT_OPERATOR;
      yield A.optionalWhitespace;
    } else if (state === states.EXPECT_OPERATOR) {
      const nextChar = yield peek;
      if (nextChar === ']') {
        yield A.char(']');
        yield A.optionalWhitespace;
        break;
      }

      const result = yield operator;
      expr.push(result);
      state = states.EXPECT_ELEMENT;
      yield A.optionalWhitespace;
    }
  }

  return T.squareBracketExpression(expr);
}).map(disambiguateOrderOfOperations);

module.exports = {
  bracketedExpr,
  squareBracketExpr,
};
