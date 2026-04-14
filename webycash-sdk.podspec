Pod::Spec.new do |s|
  s.name         = 'webycash-sdk'
  s.version      = '0.2.2'
  s.summary      = 'Webcash cross-platform wallet SDK — Swift bindings'
  s.description  = <<-DESC
    Swift bindings for the webycash-sdk native library.
    Provides a Wallet class for managing Webcash HD wallets with
    insert, pay, merge, recover, check, and encryption operations.
  DESC
  s.homepage     = 'https://github.com/webycash/webycash-sdk'
  s.license      = { :type => 'MIT', :file => 'LICENSE' }
  s.author       = { 'Harmoniq Punk' => 'disc-lack-9z@icloud.com' }
  s.source       = { :git => 'https://github.com/webycash/webycash-sdk.git', :tag => "v#{s.version}" }

  s.ios.deployment_target     = '15.0'
  s.osx.deployment_target     = '13.0'
  s.watchos.deployment_target = '8.0'
  s.tvos.deployment_target    = '15.0'
  s.swift_versions            = ['5.9', '5.10', '6.0']

  s.subspec 'CWebycashSDK' do |c|
    c.source_files         = 'swift/Sources/CWebycashSDK/include/**/*.h'
    c.public_header_files  = 'swift/Sources/CWebycashSDK/include/**/*.h'
    c.preserve_paths       = 'swift/Sources/CWebycashSDK/module.modulemap'
    c.pod_target_xcconfig  = {
      'SWIFT_INCLUDE_PATHS' => '$(PODS_TARGET_SRCROOT)/swift/Sources/CWebycashSDK',
    }
  end

  s.subspec 'WebycashSDK' do |w|
    w.dependency 'webycash-sdk/CWebycashSDK'
    w.source_files = 'swift/Sources/WebycashSDK/**/*.swift'
  end

  s.default_subspecs = 'WebycashSDK'
end
