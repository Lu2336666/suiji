#!/usr/bin/env ruby
# frozen_string_literal: true
require 'zlib'

dir = File.expand_path(__dir__)

def chunk(type, data)
  type = type.to_s.b
  data = data.to_s.b
  [data.bytesize].pack('N') + type + data + [Zlib.crc32(type + data)].pack('N')
end

def write_png(path, size)
  scale = size / 16
  rows = []
  size.times do |y|
    row = [0]
    size.times do |x|
      gx, gy = x / scale, y / scale
      rgb = if gx.between?(3, 12) && gy.between?(3, 12)
              [0x5b, 0x8c, 0xff]
            elsif gx.between?(2, 13) && gy.between?(2, 13)
              [0x15, 0x1b, 0x2e]
            else
              [0x0b, 0x10, 0x20]
            end
      # dice pips
      pips = [[5, 5], [10, 5], [5, 10], [10, 10], [8, 8]]
      pips.each do |px, py|
        rgb = [0xf4, 0xf6, 0xff] if (gx - px).abs + (gy - py).abs <= 1
      end
      row.concat(rgb)
      row << 255
    end
    rows.concat(row)
  end
  raw = rows.pack('C*')
  ihdr = [size, size, 8, 6, 0, 0, 0].pack('N2C5')
  png = [137, 80, 78, 71, 13, 10, 26, 10].pack('C*') + chunk('IHDR', ihdr) + chunk('IDAT', Zlib.deflate(raw, 9)) + chunk('IEND', '')
  File.binwrite(path, png)
  puts "#{path} #{File.size(path)}"
end

write_png(File.join(dir, 'icon-180.png'), 180)
write_png(File.join(dir, 'icon-192.png'), 192)
write_png(File.join(dir, 'icon-512.png'), 512)
