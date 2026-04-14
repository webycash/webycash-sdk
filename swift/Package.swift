// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "webcash-sdk",
    platforms: [
        .iOS(.v15),
        .macOS(.v13),
        .watchOS(.v8),
        .tvOS(.v15),
        .visionOS(.v1),
    ],
    products: [
        .library(name: "WebcashSDK", targets: ["WebcashSDK"]),
    ],
    targets: [
        .target(
            name: "CWebcashSDK",
            path: "Sources/CWebcashSDK",
            publicHeadersPath: "include"
        ),
        .target(
            name: "WebcashSDK",
            dependencies: ["CWebcashSDK"],
            path: "Sources/WebcashSDK"
        ),
    ]
)
