/**
 * ESLint rule: no-void-in-form-submit
 *
 * Prevents fire-and-forget patterns inside react-hook-form's handleSubmit callbacks.
 * These cause isSubmitting to reset immediately, enabling double-submit.
 *
 * BAD:  handleSubmit((data) => { void createThing(data); })
 * BAD:  handleSubmit((data) => { createThing(data); })  // async call without return/await
 * GOOD: handleSubmit((data) => createThing(data))        // implicit return
 * GOOD: handleSubmit(async (data) => { await createThing(data); })
 */

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow void expressions and fire-and-forget async calls inside handleSubmit callbacks',
    },
    messages: {
      noVoidInSubmit:
        'Do not use `void` inside handleSubmit — it discards the promise and breaks isSubmitting. Return the promise instead.',
    },
    schema: [],
  },

  create(context) {
    let insideHandleSubmit = 0;

    function isHandleSubmitCall(node) {
      const callee = node.callee;
      // handleSubmit(fn) or form.handleSubmit(fn)
      if (callee.type === 'Identifier' && callee.name === 'handleSubmit') return true;
      if (
        callee.type === 'MemberExpression' &&
        callee.property.type === 'Identifier' &&
        callee.property.name === 'handleSubmit'
      )
        return true;
      return false;
    }

    return {
      CallExpression(node) {
        if (isHandleSubmitCall(node)) {
          insideHandleSubmit++;
        }
      },

      'CallExpression:exit'(node) {
        if (isHandleSubmitCall(node)) {
          insideHandleSubmit--;
        }
      },

      UnaryExpression(node) {
        if (insideHandleSubmit > 0 && node.operator === 'void') {
          context.report({ node, messageId: 'noVoidInSubmit' });
        }
      },
    };
  },
};
