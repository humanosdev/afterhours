import ExpoModulesCore
import ObjectiveC
import Photos
import PhotosUI
import UIKit
import UniformTypeIdentifiers

private final class StickerPickerDelegate: NSObject, PHPickerViewControllerDelegate {
  private let completion: (Result<[String: Any], Error>) -> Void

  init(completion: @escaping (Result<[String: Any], Error>) -> Void) {
    self.completion = completion
  }

  func picker(_ picker: PHPickerViewController, didFinishPicking results: [PHPickerResult]) {
    picker.dismiss(animated: true)

    guard let result = results.first else {
      completion(.success([:]))
      return
    }

    let provider = result.itemProvider
    loadStickerRepresentation(from: provider, assetId: result.assetIdentifier, completion: completion)
  }

  private func loadStickerRepresentation(
    from provider: NSItemProvider,
    assetId: String?,
    completion: @escaping (Result<[String: Any], Error>) -> Void
  ) {
    let typeIds = [
      UTType.png.identifier,
      "org.webmproject.webp",
      UTType.gif.identifier,
      UTType.image.identifier,
    ]

    func attempt(_ index: Int) {
      guard index < typeIds.count else {
        completion(.success([:]))
        return
      }
      let typeId = typeIds[index]
      guard provider.hasItemConformingToTypeIdentifier(typeId) else {
        attempt(index + 1)
        return
      }
      provider.loadFileRepresentation(forTypeIdentifier: typeId) { url, error in
        DispatchQueue.main.async {
          if let error = error {
            completion(.failure(error))
            return
          }
          guard let url = url else {
            attempt(index + 1)
            return
          }
          do {
            let ext = url.pathExtension.isEmpty ? "png" : url.pathExtension
            let destination = FileManager.default.temporaryDirectory
              .appendingPathComponent("imessage-picked-\(UUID().uuidString).\(ext)")

            if FileManager.default.fileExists(atPath: destination.path) {
              try FileManager.default.removeItem(at: destination)
            }
            try FileManager.default.copyItem(at: url, to: destination)

            var width = 512
            var height = 512
            if let data = try? Data(contentsOf: destination),
               let image = UIImage(data: data) {
              width = Int(image.size.width * image.scale)
              height = Int(image.size.height * image.scale)
            }

            var payload: [String: Any] = [
              "uri": destination.absoluteString,
              "width": width,
              "height": height,
            ]
            if let assetId = assetId {
              payload["assetId"] = assetId
            }
            completion(.success(payload))
          } catch {
            completion(.failure(error))
          }
        }
      }
    }

    attempt(0)
  }
}

enum IMessageStickerPicker {
  static func stickersFilter() -> PHPickerFilter? {
    if #available(iOS 17.0, *) {
      return (PHPickerFilter.self as AnyObject).value(forKey: "stickersFilter") as? PHPickerFilter
    }
    return nil
  }

  @MainActor
  static func present(from viewController: UIViewController) async throws -> [String: Any] {
    try await withCheckedThrowingContinuation { continuation in
      var config = PHPickerConfiguration(photoLibrary: .shared())
      config.selectionLimit = 1
      config.preferredAssetRepresentationMode = .current

      if #available(iOS 17.0, *) {
        config.mode = .compact
        if let stickersFilter = stickersFilter() {
          config.filter = stickersFilter
        } else {
          config.filter = .images
        }
      } else {
        config.filter = .images
      }

      let picker = PHPickerViewController(configuration: config)
      let delegate = StickerPickerDelegate { result in
        switch result {
        case .success(let payload):
          continuation.resume(returning: payload)
        case .failure(let error):
          continuation.resume(throwing: error)
        }
      }
      picker.delegate = delegate
      objc_setAssociatedObject(
        picker,
        Unmanaged.passUnretained(delegate as AnyObject).toOpaque(),
        delegate,
        .OBJC_ASSOCIATION_RETAIN_NONATOMIC
      )

      viewController.present(picker, animated: true)
    }
  }
}

/// iOS Messages sticker drawer via system picker + optional Photos fallback.
public class IntencityMessageStickersModule: Module {
  public func definition() -> ModuleDefinition {
    Name("IntencityMessageStickers")

    AsyncFunction("pickSticker") { () -> [String: Any] in
      try await self.pickSticker()
    }

    AsyncFunction("loadStickers") { (limit: Int) -> [[String: Any]] in
      try await self.loadStickers(limit: max(1, min(limit, 160)))
    }

    AsyncFunction("getStickerUri") { (assetId: String) -> String? in
      try await self.getStickerUri(assetId: assetId)
    }
  }

  @MainActor
  private func pickSticker() async throws -> [String: Any] {
    guard let presenter = Self.topViewController(appContext: appContext) else {
      throw Exception(name: "ERR_NO_VIEW_CONTROLLER", description: "Unable to present sticker picker.")
    }
    return try await IMessageStickerPicker.present(from: presenter)
  }

  @MainActor
  private static func topViewController(appContext: AppContext?) -> UIViewController? {
    if var top = appContext?.utilities?.currentViewController() {
      while let presented = top.presentedViewController {
        top = presented
      }
      return top
    }

    let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
    let windows = scenes
      .flatMap(\.windows)
      .filter { !$0.isHidden && $0.alpha > 0 }
      .sorted { $0.windowLevel.rawValue > $1.windowLevel.rawValue }

    for window in windows {
      guard var top = window.rootViewController else { continue }
      while let presented = top.presentedViewController {
        top = presented
      }
      return top
    }

    return nil
  }

  private static let stickersAlbumSubtypeRawValues: [Int] = [
    222,
    223,
    1_400_138_610,
    1_937_009_522,
  ]

  private static let stickersAlbumTitleTokens = [
    "stickers",
    "sticker",
    "autocollants",
    "pegatinas",
    "adesivi",
    "ステッカー",
    "스티커",
  ]

  private func titleLooksLikeStickers(_ title: String?) -> Bool {
    guard let title = title?.lowercased(), !title.isEmpty else { return false }
    return Self.stickersAlbumTitleTokens.contains(where: { title.contains($0) })
  }

  private func isStickersCollection(_ collection: PHAssetCollection) -> Bool {
    if titleLooksLikeStickers(collection.localizedTitle) {
      return true
    }
    return Self.stickersAlbumSubtypeRawValues.contains(collection.assetCollectionSubtype.rawValue)
  }

  private func fetchStickerCollections() -> [PHAssetCollection] {
    var collections: [PHAssetCollection] = []
    var seen = Set<String>()

    func appendUnique(_ collection: PHAssetCollection) {
      guard !seen.contains(collection.localIdentifier) else { return }
      seen.insert(collection.localIdentifier)
      collections.append(collection)
    }

    let smartAlbums = PHAssetCollection.fetchAssetCollections(
      with: .smartAlbum,
      subtype: .any,
      options: nil
    )
    smartAlbums.enumerateObjects { collection, _, _ in
      if self.isStickersCollection(collection) {
        appendUnique(collection)
      }
    }

    let userAlbums = PHAssetCollection.fetchAssetCollections(
      with: .album,
      subtype: .any,
      options: nil
    )
    userAlbums.enumerateObjects { collection, _, _ in
      if self.isStickersCollection(collection) {
        appendUnique(collection)
      }
    }

    return collections
  }

  private func isStickerImageAsset(_ asset: PHAsset) -> Bool {
    guard asset.mediaType == .image else { return false }
    let subtypes = asset.mediaSubtypes
    if subtypes.contains(.photoScreenshot) || subtypes.contains(.photoPanorama) {
      return false
    }
    let resources = PHAssetResource.assetResources(for: asset)
    return resources.contains { resource in
      let typeId = resource.uniformTypeIdentifier.lowercased()
      return typeId == UTType.png.identifier
        || typeId == "public.png"
        || typeId == "org.webmproject.webp"
        || typeId == "com.compuserve.gif"
    }
  }

  private func appendStickerAsset(
    _ asset: PHAsset,
    into results: inout [[String: Any]],
    seen: inout Set<String>,
    limit: Int
  ) {
    guard results.count < limit else { return }
    guard isStickerImageAsset(asset) else { return }
    guard !seen.contains(asset.localIdentifier) else { return }
    seen.insert(asset.localIdentifier)
    results.append([
      "id": asset.localIdentifier,
      "width": asset.pixelWidth,
      "height": asset.pixelHeight,
      "kind": "sticker",
    ])
  }

  private func loadStickers(limit: Int) async throws -> [[String: Any]] {
    let status = await PHPhotoLibrary.requestAuthorization(for: .readWrite)
    guard status == .authorized || status == .limited else {
      return []
    }

    var results: [[String: Any]] = []
    var seen = Set<String>()

    for collection in fetchStickerCollections() {
      guard results.count < limit else { break }
      let options = PHFetchOptions()
      options.fetchLimit = limit
      options.sortDescriptors = [NSSortDescriptor(key: "modificationDate", ascending: false)]
      let assets = PHAsset.fetchAssets(in: collection, options: options)
      assets.enumerateObjects { asset, _, stop in
        if results.count >= limit {
          stop.pointee = true
          return
        }
        self.appendStickerAsset(asset, into: &results, seen: &seen, limit: limit)
      }
    }

    return results
  }

  private func preferredStickerResource(for asset: PHAsset) -> PHAssetResource? {
    let resources = PHAssetResource.assetResources(for: asset)
    if let png = resources.first(where: { res in
      res.uniformTypeIdentifier == UTType.png.identifier
        || res.uniformTypeIdentifier == "public.png"
        || res.originalFilename.lowercased().hasSuffix(".png")
    }) {
      return png
    }
    if let webp = resources.first(where: { $0.uniformTypeIdentifier == "org.webmproject.webp" }) {
      return webp
    }
    return resources.first(where: { $0.type == .photo || $0.type == .alternatePhoto })
  }

  private func getStickerUri(assetId: String) async throws -> String? {
    let assets = PHAsset.fetchAssets(withLocalIdentifiers: [assetId], options: nil)
    guard let asset = assets.firstObject else { return nil }
    guard isStickerImageAsset(asset) else { return nil }
    guard let resource = preferredStickerResource(for: asset) else { return nil }

    let ext: String
    if resource.uniformTypeIdentifier == UTType.png.identifier || resource.uniformTypeIdentifier == "public.png" {
      ext = "png"
    } else if resource.uniformTypeIdentifier == "org.webmproject.webp" {
      ext = "webp"
    } else {
      ext = "png"
    }

    let tmp = FileManager.default.temporaryDirectory
      .appendingPathComponent("imessage-sticker-\(UUID().uuidString).\(ext)")

    if FileManager.default.fileExists(atPath: tmp.path) {
      try? FileManager.default.removeItem(at: tmp)
    }

    return try await withCheckedThrowingContinuation { continuation in
      PHAssetResourceManager.default().writeData(for: resource, toFile: tmp, options: nil) { error in
        if let error = error {
          continuation.resume(throwing: error)
        } else {
          continuation.resume(returning: tmp.absoluteString)
        }
      }
    }
  }
}
