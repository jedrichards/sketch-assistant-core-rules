import { t } from '@lingui/macro'
import { RuleContext, RuleFunction, Node, FileFormat } from '@sketch-hq/sketch-assistant-types'

import { CreateRuleFunction } from '../..'

const styleHasDisabledInnerShadows = (style: FileFormat.Style): boolean =>
  style.innerShadows.some((innerShadow) => !innerShadow.isEnabled)

export const createRule: CreateRuleFunction = (i18n) => {
  const rule: RuleFunction = async (context: RuleContext): Promise<void> => {
    const { utils } = context
    await utils.iterateCache({
      async $layers(node: Node): Promise<void> {
        const layer = utils.nodeToObject<FileFormat.AnyLayer>(node)
        if (!('style' in layer)) return // Narrow type to layers with a `style` prop
        if (!layer.style) return // Narrow type to truthy `style` prop
        if (typeof layer.sharedStyleID === 'string') return // Ignore layers using a shared style

        if (styleHasDisabledInnerShadows(layer.style)) {
          utils.report({
            node,
            message: i18n._(t`Unexpected disabled inner shadow on layer style`),
          })
        }
      },
      async sharedStyle(node: Node): Promise<void> {
        const sharedStyle = utils.nodeToObject<FileFormat.SharedStyle>(node)
        if (styleHasDisabledInnerShadows(sharedStyle.value)) {
          utils.report({
            node,
            message: i18n._(t`Unexpected disabled inner shadow in shared style`),
          })
        }
      },
    })
  }

  return {
    rule,
    name: 'inner-shadows-no-disabled',
    title: i18n._(t`No Disabled Inner Shadows`),
    description: i18n._(t`Forbids disabled inner shadow styles throughout the document`),
  }
}
