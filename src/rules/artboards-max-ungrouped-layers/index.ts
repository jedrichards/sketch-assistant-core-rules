import { t } from '@lingui/macro'
import { RuleContext, RuleFunction, FileFormat } from '@sketch-hq/sketch-assistant-types'

import { CreateRuleFunction } from '../..'

function assertMaxUngrouped(maxUngroupedLayers: unknown): asserts maxUngroupedLayers is number {
  if (typeof maxUngroupedLayers !== 'number') throw Error()
}

export const createRule: CreateRuleFunction = (i18n) => {
  const rule: RuleFunction = async (context: RuleContext): Promise<void> => {
    const { utils } = context
    const maxUngroupedLayers = utils.getOption('maxUngroupedLayers')
    assertMaxUngrouped(maxUngroupedLayers)
    await utils.iterateCache({
      async artboard(node): Promise<void> {
        const artboard = utils.nodeToObject<FileFormat.Artboard>(node)
        const nonGroupLayers = artboard.layers.filter((layer) => layer._class !== 'group').length
        if (nonGroupLayers > maxUngroupedLayers) {
          utils.report({
            node,
            message: i18n._(
              t`Found ${nonGroupLayers} ungrouped layers at top level of artboard, expected at most ${maxUngroupedLayers}`,
            ),
          })
        }
      },
    })
  }

  return {
    rule,
    name: 'artboards-max-ungrouped-layers',
    title: i18n._(t`Max Ungrouped Layers in Artboards`),
    description: i18n._(
      t`Specifies a maximum number of ungrouped layers allowable at the top-level of artboards`,
    ),
    getOptions(helpers) {
      return [
        helpers.numberOption({
          name: 'maxUngroupedLayers',
          title: i18n._(t`Maximum Ungrouped Layers`),
          defaultValue: 5,
          description: i18n._(t`Maximum number of ungrouped layers`),
          minimum: 1,
        }),
      ]
    },
  }
}