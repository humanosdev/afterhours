require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'IntencityMessageStickers'
  s.version        = package['version']
  s.summary        = package['name']
  s.license        = 'MIT'
  s.author         = 'Intencity'
  s.homepage       = 'https://intencity.app'
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.9'
  s.source         = { :git => '' }
  s.static_framework = true
  s.frameworks = 'Photos', 'PhotosUI'
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.{h,m,mm,swift,hpp,cpp}'
end
