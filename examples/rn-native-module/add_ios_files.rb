# Thêm file vào target Xcode (tương đương kéo thả file vào Xcode, tick target NativeDemo).
require 'xcodeproj'
project = Xcodeproj::Project.open('ios/NativeDemo.xcodeproj')
target = project.targets.find { |t| t.name == 'NativeDemo' }
group = project.main_group['NativeDemo']
names = %w[DemoDevice.swift RCTNativeDemoDevice.h RCTNativeDemoDevice.mm]
# Gỡ bản thêm sai (nếu có) rồi thêm lại với đường dẫn tính từ thư mục ios/
group.files.select { |f| names.include?(File.basename(f.path.to_s)) }.each do |f|
  target.source_build_phase.remove_file_reference(f)
  f.remove_from_project
end
names.each do |name|
  ref = group.new_reference("NativeDemo/#{name}")
  target.add_file_references([ref]) unless name.end_with?('.h')
end
project.save
puts 'ok'
