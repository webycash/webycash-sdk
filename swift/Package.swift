// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "webycash-sdk",
    platforms: [
        .iOS(.v15),
        .macOS(.v13),
        .watchOS(.v8),
        .tvOS(.v15),
        .visionOS(.v1),
    ],
    products: [
        .library(name: "WebycashSDK", targets: ["WebycashSDK"]),
    ],
    targets: [
        .target(
            name: "CWebycashSDK",
            path: "Sources/CWebycashSDK",
            publicHeadersPath: "include",
            linkerSettings: [
                .linkedLibrary("webycash_sdk"),
                // Resolve after `cargo build --release` in ../native (CI stages the dylib there too).
                .unsafeFlags(["-L../native/target/release"]),
            ]
        ),
        .target(
            name: "WebycashSDK",
            dependencies: ["CWebycashSDK"],
            path: "Sources/WebycashSDK"
        ),
        .testTarget(
            name: "WebycashSDKTests",
            dependencies: ["WebycashSDK"],
            path: "Tests/WebycashSDKTests"
        ),
    ]
)
