package expo.modules.intencitymessagestickers

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class IntencityMessageStickersModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("IntencityMessageStickers")

    AsyncFunction("loadStickers") { _: Int ->
      emptyList<Map<String, Any>>()
    }

    AsyncFunction("getStickerUri") { _: String ->
      null
    }
  }
}
