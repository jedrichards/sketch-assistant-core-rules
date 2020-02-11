import {
  Rule,
  RuleModule,
  RuleInvocationContext,
  Node,
} from '@sketch-hq/sketch-lint-core'
import FileFormat from '@sketch-hq/sketch-file-format-ts'
import { t, plural } from '@lingui/macro'
import { _ } from '../i18n'

function assertMaxIdentical(val: unknown): asserts val is number {
  if (typeof val !== 'number') {
    throw new Error()
  }
}

const rule: Rule = async (context: RuleInvocationContext): Promise<void> => {
  const { utils } = context
  // Gather option value and assert its type
  const maxIdentical = utils.getOption('maxIdentical')
  assertMaxIdentical(maxIdentical)
  const results: Map<string, Node[]> = new Map()
  await utils.iterateCache({
    text(node): void {
      const layer = utils.nodeToObject<FileFormat.Text>(node)
      if (typeof layer.sharedStyleID === 'string') return // Ignore layers using a shared style
      // Determine whether we're inside a symbol instance, if so return early since
      // duplicate layer styles are to be expected across the docucument in instances
      const classes: string[] = [node._class]
      utils.iterateParents(node, parent => {
        if (typeof parent === 'object' && '_class' in parent)
          classes.push(parent._class)
      })
      if (classes.includes('symbolInstance')) return
      // Get an md5 hash of the style object. Only consider a subset of style
      // object properties when computing the hash (can revisit this to make the
      // check looser or stricter)
      const hash = utils.objectHash({
        borders: layer.style?.borders,
        borderOptions: layer.style?.borderOptions,
        blur: layer.style?.blur,
        fills: layer.style?.fills,
        shadows: layer.style?.shadows,
        innerShadows: layer.style?.innerShadows,
        textStyle: layer.style?.textStyle,
      })
      // Add the style object hash and current node to the result set
      if (results.has(hash)) {
        const nodes = results.get(hash)
        nodes?.push(node)
      } else {
        results.set(hash, [node])
      }
    },
  })
  // Loop the results, generating violations as needed
  for (const [, nodes] of results) {
    const numIdentical = nodes.length
    if (numIdentical > maxIdentical) {
      utils.report(
        nodes.map(node => ({
          node,
          message: _(
            plural({
              value: maxIdentical,
              one: `Expected no identical text styles in the document, but found ${numIdentical} matching this layer's text style. Consider a shared text style instead`,
              other: `Expected a maximum of # identical text styles in the document, but found ${numIdentical} instances of this layer's text style. Consider a shared text style instead`,
            }),
          ),
        })),
      )
    }
  }
}

const ruleModule: RuleModule = {
  rule,
  name: 'text-styles-prefer-shared',
  title: _(t`Prefer Shared Text Styles`),
  description: _(
    t`Disallow identical text styles in favour of shared text styles`,
  ),
  getOptions: helpers => [
    helpers.integerOption({
      name: 'maxIdentical',
      title: _(t`Max Identical`),
      description: _(
        t`Maximum number of identical text styles allowable in the document`,
      ),
      minimum: 1,
      defaultValue: 1,
    }),
  ],
}

export { ruleModule }
