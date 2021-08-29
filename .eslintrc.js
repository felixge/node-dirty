'use strict';

module.exports = {
  env: {
    es2017: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:eslint-comments/recommended',
    'plugin:node/recommended',
    'plugin:promise/recommended',
    'plugin:you-dont-need-lodash-underscore/compatible',
  ],
  ignorePatterns: [
    'node_modules/',
  ],
  plugins: [
    'eslint-comments',
    'node',
    'prefer-arrow',
    'promise',
    'you-dont-need-lodash-underscore',
  ],
  root: true,
  rules: {
    'array-bracket-newline': ['error', 'consistent'],
    'array-bracket-spacing': 'error',
    'array-element-newline': ['error', 'consistent'],
    'arrow-body-style': 'error',
    'arrow-parens': 'error',
    'arrow-spacing': 'error',
    'block-spacing': 'error',
    'brace-style': ['error', '1tbs', {allowSingleLine: true}],
    'camelcase': 'error',
    'comma-dangle': ['error', {
      arrays: 'always-multiline',
      objects: 'always-multiline',
      imports: 'always-multiline',
      exports: 'always-multiline',
      functions: 'never',
    }],
    'comma-spacing': 'error',
    'comma-style': 'error',
    'computed-property-spacing': 'error',
    'curly': ['error', 'multi-line', 'consistent'],
    'dot-location': ['error', 'property'],
    'dot-notation': 'error',
    'eol-last': 'error',
    'eqeqeq': ['error', 'always', {null: 'never'}],
    'func-call-spacing': 'error',
    'guard-for-in': 'error',
    'implicit-arrow-linebreak': 'error',
    'indent': ['error', 2, {
      CallExpression: {
        arguments: 2,
      },
      FunctionDeclaration: {
        parameters: 2,
      },
      FunctionExpression: {
        parameters: 2,
      },
      MemberExpression: 2,
      SwitchCase: 1,
      flatTernaryExpressions: true,
      offsetTernaryExpressions: true,
    }],
    'key-spacing': 'error',
    'keyword-spacing': 'error',
    'linebreak-style': 'error',
    'max-len': ['error', {code: 100, tabWidth: 2, ignoreUrls: true}],
    'new-cap': 'error',
    'new-parens': 'error',
    'no-array-constructor': 'error',
    'no-caller': 'error',
    'no-constant-condition': ['error', {checkLoops: false}],
    'no-duplicate-imports': 'error',
    'no-eval': 'error',
    'no-extend-native': 'error',
    'no-implicit-globals': 'error',
    'no-implied-eval': 'error',
    'no-lonely-if': 'error',
    'no-multi-spaces': 'error',
    'no-multi-str': 'error',
    'no-multiple-empty-lines': ['error', {max: 2, maxBOF: 0, maxEOF: 0}],
    'no-new-object': 'error',
    'no-new-wrappers': 'error',
    'no-nonoctal-decimal-escape': 'error',
    'no-prototype-builtins': 'error',
    'no-script-url': 'error',
    'no-sequences': 'error',
    'no-tabs': 'error',
    'no-throw-literal': 'error',
    'no-trailing-spaces': 'error',
    'no-unsafe-optional-chaining': 'error',
    'no-unused-vars': ['error', {args: 'none'}],
    'no-use-before-define': 'error',
    'no-var': 'error',
    'no-whitespace-before-property': 'error',
    'nonblock-statement-body-position': 'error',
    'object-curly-newline': 'error',
    'object-curly-spacing': 'error',
    'object-shorthand': 'error',
    'one-var': ['error', {initialized: 'never'}],
    'one-var-declaration-per-line': ['error', 'initializations'],
    'operator-assignment': 'error',
    'operator-linebreak': 'error',
    'padded-blocks': ['error', 'never'],
    'prefer-arrow-callback': 'error',
    'prefer-arrow/prefer-arrow-functions': 'error',
    'prefer-const': 'error',
    'prefer-exponentiation-operator': 'error',
    'prefer-promise-reject-errors': 'error',
    'prefer-rest-params': 'error',
    'prefer-spread': 'error',
    'prefer-template': 'error',
    // This rule is largely unnecessary thanks to the `await` keyword (`.then()` should be rare).
    // Also, being forced to add a return statement for a valueless Promise is annoying.
    'promise/always-return': 'off',
    // This rule is largely unnecessary because most browsers now log unhandled Promise rejections.
    'promise/catch-or-return': 'off',
    // Too many false positives. The docs for this rule say to use nodify, but in the following
    // example nodeify and util.callbackify() don't work because the `next` callback should not
    // always be called:
    //     app.use((req, res, next) => { asyncMiddleware(req, res, next).catch(next); });
    // This rule does catch legitimate issues, but as code is modernized with `async` and `await`,
    // this rule will become less relevant.
    'promise/no-callback-in-promise': 'off',
    // Too many false positives. In particular, there is no good way to process in parallel values
    // that were obtained asynchronously unless nested .then() calls are used. Example:
    //     asyncGetItems().then((items) => Promise.all(
    //         items.map((item) => asyncProcessItem(item).then(asyncConveyResults))));
    // The nested .then() in the above example can be avoided by changing the logic like this:
    //     asyncGetItems()
    //         .then((items) => Promise.all(items.map(asyncProcessItem)))
    //         .then((results) => Promise.all(results.map(asyncConveyResults)));
    // but there are problems with the logic change:
    //   * No result will be conveyed if any of the processing calls fail.
    //   * No result will be conveyed until all items are done being processed.
    // The proper way to address nested .then() calls is to use await instead of .then(), but that
    // should be the topic of a different ESLint rule. This rule does catch legitimate issues, but
    // as code is modernized with `async` and `await`, this rule will become less relevant.
    'promise/no-nesting': 'off',
    'quote-props': ['error', 'consistent-as-needed'],
    'quotes': ['error', 'single', {avoidEscape: true}],
    'rest-spread-spacing': 'error',
    'semi': 'error',
    'semi-spacing': 'error',
    'semi-style': 'error',
    'space-before-blocks': 'error',
    'space-before-function-paren': [
      'error',
      {anonymous: 'always', asyncArrow: 'always', named: 'never'},
    ],
    'space-in-parens': 'error',
    'space-infix-ops': 'error',
    'space-unary-ops': ['error', {words: true, nonwords: false}],
    'spaced-comment': 'error',
    'strict': ['error', 'global'],
    'switch-colon-spacing': 'error',
    'template-curly-spacing': 'error',
    'template-tag-spacing': 'error',
  },
};
