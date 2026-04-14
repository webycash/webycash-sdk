Pod::Spec.new do |s|
  s.name         = 'webycash-sdk'
  s.version      = '0.1.4'
  s.summary      = 'Webcash cross-platform wallet SDK'
  s.description  = 'Native FFI bindings for the Webcash HD wallet — supports iOS, macOS, watchOS, tvOS, visionOS.'
  s.homepage     = 'https://github.com/webycash/webycash-sdk'
  s.license      = { :type => 'MIT', :file => 'LICENSE' }
  s.author       = { 'Harmoniq Punk' => 'disc-lack-9z@icloud.com' }
  s.source       = { :git => 'https://github.com/webycash/webycash-sdk.git', :tag => "v#{s.version}" }

  s.ios.deployment_target     = '15.0'
  s.osx.deployment_target     = '13.0'
  s.watchos.deployment_target = '8.0'
  s.tvos.deployment_target    = '15.0'
  s.visionos.deployment_target = '1.0'

  s.source_files        = 'swift/Sources/WebycashSDK/**/*.swift'
  s.preserve_paths      = 'include/**/*', 'swift/Sources/CWebycashSDK/**/*'
  s.vendored_libraries  = 'libwebycash_sdk.a'
  s.pod_target_xcconfig = {
    'HEADER_SEARCH_PATHS' => '"$(PODS_TARGET_SRCROOT)/include"',
    'OTHER_LDFLAGS'       => '-lwebycash_sdk',
  }
end
