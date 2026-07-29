require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name = "CumquatNative"
  s.version = package["version"]
  s.summary = package["description"]
  s.description = package["description"]
  s.homepage = "https://github.com/ydrea/ar"
  s.license = { :type => "UNLICENSED" }
  s.author = { "Cumquat" => "andrija.wrld@gmail.com" }
  s.source = {
    :git => "https://github.com/ydrea/ar.git",
    :tag => s.version.to_s,
  }

  s.platforms = { :ios => "15.1" }
  s.source_files = [
    "cpp/**/*.{h,cpp}",
    "ios/**/*.{h,m,mm}",
  ]
  s.public_header_files = [
    "cpp/**/*.h",
    "ios/**/*.h",
  ]
  s.header_mappings_dir = "."

  s.pod_target_xcconfig = {
    "CLANG_CXX_LANGUAGE_STANDARD" => "c++20",
  }

  install_modules_dependencies(s)
end
