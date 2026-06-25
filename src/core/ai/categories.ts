export interface IAICategory {
  id: string;
  name: string;
  group: 'Architecture' | 'Exterior' | 'Interior';
}

export const AI_CATEGORIES: IAICategory[] = [
  // Kiến trúc (Architecture)
  { id: "gate_main", name: "Cổng chính", group: 'Exterior' },
  { id: "gate_sub", name: "Cổng phụ", group: 'Exterior' },
  { id: "gate_pillar", name: "Trụ cổng", group: 'Architecture' },
  { id: "fence", name: "Hàng rào", group: 'Exterior' },
  { id: "gate_light", name: "Đèn cổng", group: 'Exterior' },
  { id: "camera", name: "Camera", group: 'Exterior' },
  { id: "doorbell", name: "Chuông cửa", group: 'Exterior' },
  { id: "front_yard", name: "Sân trước", group: 'Exterior' },
  { id: "driveway", name: "Đường xe vào", group: 'Exterior' },
  { id: "garage", name: "Gara / mái che xe", group: 'Architecture' },
  { id: "main_path", name: "Lối đi chính vào nhà", group: 'Exterior' },
  { id: "side_path", name: "Lối đi hông nhà", group: 'Exterior' },
  { id: "garden_path", name: "Lối đi ra vườn", group: 'Exterior' },
  { id: "fruit_garden", name: "Vườn cây ăn trái", group: 'Exterior' },
  { id: "veg_garden", name: "Vườn rau sạch", group: 'Exterior' },
  { id: "planter_box", name: "Bồn cây trang trí", group: 'Exterior' },
  { id: "drainage", name: "Rãnh thoát nước sân", group: 'Exterior' },
  
  { id: "stairs_front", name: "Bậc tam cấp", group: 'Architecture' },
  { id: "hall_main", name: "Sảnh chính", group: 'Architecture' },
  
  { id: "floor_base", name: "Nền nhà", group: 'Architecture' },
  { id: "column_beam_wall", name: "Cột, dầm, tường", group: 'Architecture' },
  { id: "roof_japanese", name: "Mái Nhật", group: 'Architecture' },
  { id: "roof_gutter", name: "Máng xối mái", group: 'Architecture' },
  { id: "ceiling", name: "Trần nhà", group: 'Architecture' },
  { id: "door_main", name: "Cửa chính", group: 'Architecture' },
  { id: "window", name: "Cửa sổ", group: 'Architecture' },
  { id: "door_room", name: "Cửa phòng", group: 'Architecture' },

  // Nội thất (Interior)
  { id: "living_room", name: "Phòng khách", group: 'Interior' },
  { id: "dining_room", name: "Phòng ăn", group: 'Interior' },
  { id: "kitchen", name: "Bếp nấu (nhà bếp)", group: 'Interior' },
  { id: "bedroom_1", name: "Phòng ngủ 1", group: 'Interior' },
  { id: "bedroom_2", name: "Phòng ngủ 2", group: 'Interior' },
  { id: "bedroom_master", name: "Phòng ngủ master", group: 'Interior' },
  { id: "wc_master", name: "WC master", group: 'Interior' },
  { id: "wc_shared", name: "WC ngoài 1.5m x 2m", group: 'Interior' },
  { id: "bathroom_shared", name: "Phòng tắm ngoài 2m x 2m", group: 'Interior' },
  { id: "laundry_yard", name: "Sân phơi sau", group: 'Architecture' },
  { id: "laundry_room", name: "Khu giặt", group: 'Interior' },

  { id: "network_wifi", name: "Camera / mạng / wifi", group: 'Interior' },
  { id: "light_indoor", name: "Đèn trong nhà", group: 'Interior' },
  { id: "light_outdoor", name: "Đèn ngoài nhà", group: 'Exterior' },

  { id: "paint_wall", name: "Sơn nước", group: 'Interior' },
  { id: "tile_floor", name: "Gạch lát nền", group: 'Interior' },
  { id: "tile_wc", name: "Gạch ốp WC", group: 'Interior' },
  { id: "sanitary_equipment", name: "Thiết bị vệ sinh", group: 'Interior' },
  { id: "furniture_living", name: "Nội thất phòng khách", group: 'Interior' },
  { id: "furniture_dining", name: "Nội thất phòng ăn", group: 'Interior' },
  { id: "furniture_bedroom", name: "Nội thất phòng ngủ", group: 'Interior' },
  { id: "furniture_kitchen", name: "Nội thất bếp", group: 'Interior' },
  { id: "curtain", name: "Rèm cửa", group: 'Interior' },
  { id: "plants_indoor", name: "Cây xanh hoàn thiện", group: 'Interior' },
];
