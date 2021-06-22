const hex = n => n.toString(16).padStart(4, '0');
const addr = n => `&${hex(n)}`;
const lit = n => `$${hex(n)}`;
const negative = n => lit((~n & 0xffff) + 1);
const structOffset = (struct, property) => `[<${struct}> ${addr(0)}.${property}]`;

module.exports = ({ cars }) => `

structure Frog {
  x: $02, y: $02,
  tileIndex: $01
}

structure Car {
  x: $02, y: $02,
  tileIndex: $01, animationOffset: $01,
  ignore0: $03,
  velocity: $02
}

structure Input {
  Up: $01, Down: $01,
  Left: $01, Right: $01,
  A: $01, B: $01,
  Start: $01, Select: $01
}

structure CollisionPoints {
  x: $02, y: $02,
  x2: $02, y2: $02
}

constant InputAddr = $2620
constant FrogAddr = $2020

constant FrogCollision = $4000
constant OtherCollision = $4008

start:

check_up_pressed:
  mov8 &[<Input> InputAddr.Up], acu
  jeq ${lit(0)}, &[!check_down_pressed]
  mov &[<Frog> FrogAddr.y], r1
  add ${negative(4)}, r1
  mov acu, &[<Frog> FrogAddr.y]

check_down_pressed:
  mov8 &[<Input> InputAddr.Down], acu
  jeq ${lit(0)}, &[!check_left_pressed]
  mov &[<Frog> FrogAddr.y], r1
  add ${lit(4)}, r1
  mov acu, &[<Frog> FrogAddr.y]

check_left_pressed:
  mov8 &[<Input> InputAddr.Left], acu
  jeq ${lit(0)}, &[!check_right_pressed]
  mov &[<Frog> FrogAddr.x], r1
  add ${negative(4)}, r1
  mov acu, &[<Frog> FrogAddr.x]

check_right_pressed:
  mov8 &[<Input> InputAddr.Right], acu
  jeq ${lit(0)}, &[!check_input_end]
  mov &[<Frog> FrogAddr.x], r1
  add ${lit(4)}, r1
  mov acu, &[<Frog> FrogAddr.x]

check_input_end:

update_cars:

  mov8 &[!carsOffset], acu                  ;; load cars offset into the acu
  jeq ${lit(0x20)}, &[!end_of_update_cars]  ;; jump if we've processed all the cars

  ;; write the next car offset into memory
  mov acu, r5
  add ${lit(0x10)}, acu
  movl acu, &[!carsOffset]
  mov r5, acu

  add ${lit(cars)}, acu ;; place address of the current car into the acu
  mov acu, r5           ;; place car address into r5
  mov &acu, r1          ;; load the xpos into r1

  ;; calculate the address of the speed property of the car and place in the acu
  add ${structOffset('Car', 'velocity')}, r5

  mov &acu, acu         ;; put the value of the speed property in the acu
  add acu, r1           ;; calculate the new x position, place in acu
  mov acu, &r5          ;; move the new x value to the cars x property

car_collision:
  psh acu
  psh r1
  mov8 &[!carsOffset], acu
  rsf acu, ${lit(4)} ;; divide by 16
  add ${negative(1)}, acu
  mov acu, r1
  psh ${lit(0)}      ;; no args (according to the VM calling convention)
  cal [!collision]
  jne ${lit(1)}, &[!end_of_car_collision]
  mov ${lit(8)}, &[<Frog> FrogAddr.x]
  mov ${lit(8)}, &[<Frog> FrogAddr.y]
end_of_car_collision:
  pop r1
  pop acu

  ;; Check boundaries (moved off left side of screen)
  mov acu, r6           ;; first backup the x position
  and acu, $8000        ;; x position is negative?
  jne $8000, &[!cars_check_pos_vel_bounds]
  mov $f0, acu          ;; reset x position to 240
  mov acu, &r5
  mov [!update_cars], ip ;; process the next car

  ;; Check boundaries (moved off right side of screen)
cars_check_pos_vel_bounds:
  mov r6, acu           ;; restore the x position in case it changed
  jgt $f0, &[!update_cars]  ;; if 240 > x pos, skip back to the top
  mov $0, acu           ;; reset x position to 0
  mov acu, &r5

car_loop_back:
  mov [!update_cars], ip ;; process the next car


end_of_update_cars:
  mov ${lit(0)}, &[!carsOffset]

end_of_game_logic:
  mov8 ${lit(1)}, &[!hasEnded]
end_of_game_logic_loop:
  mov [!end_of_game_logic_loop], ip



;; collision(spriteIndex: r1) -> boolean: acu
collision:

;; Frog Collision Points
  ;; x
  mov &[<Frog> FrogAddr.x], acu
  mov acu, &[<CollisionPoints> FrogCollision.x]

  ;; y
  mov &[<Frog> FrogAddr.y], acu
  mov acu, &[<CollisionPoints> FrogCollision.y]

  ;; x2
  mov &[<Frog> FrogAddr.x], acu
  add ${lit(8)}, acu
  mov acu, &[<CollisionPoints> FrogCollision.x2]

  ;; y2
  mov &[<Frog> FrogAddr.y], acu
  add ${lit(8)}, acu
  mov acu, &[<CollisionPoints> FrogCollision.y2]

  ;; Calculate the base address of the sprite
  mov r1, acu
  mul $10, acu
  add ${lit(cars)}, acu
  mov acu, r2

  ;; Sprite x
  mov &r2, acu
  mov acu, &[<CollisionPoints> OtherCollision.x]

  ;; Sprite y
  mov r2, acu
  add ${structOffset('Car', 'y')}, acu
  mov &acu, acu
  mov acu, &[<CollisionPoints> OtherCollision.y]

  ;; Sprite x2
  mov &r2, acu
  add ${lit(8)}, acu
  mov acu, &[<CollisionPoints> OtherCollision.x2]

  ;; Sprite y2
  mov r2, acu
  add ${structOffset('Car', 'y')}, acu
  mov &acu, acu
  add ${lit(8)}, acu
  mov acu, &[<CollisionPoints> OtherCollision.y2  ]

  ;; perform the tile comparrisons to check for collision

  collision_corner_1:
  ;; if (f.x >= o.x && f.x < o.x2 && f.y >= o.y && f.y < o.y2)
  mov &[<CollisionPoints> FrogCollision.x], acu
  mov &[<CollisionPoints> OtherCollision.x], r1
  jgt r1, &[!collision_corner_2]                           ;; f.x >= o.x
  mov &[<CollisionPoints> OtherCollision.x2], r1
  jle r1, &[!collision_corner_2]                           ;; f.x < o.x2
  mov &[<CollisionPoints> FrogCollision.y], acu
  mov &[<CollisionPoints> OtherCollision.y], r1
  jgt r1, &[!collision_corner_2]                           ;; f.y >= o.y
  mov &[<CollisionPoints> OtherCollision.y2], r1
  jle r1, &[!collision_corner_2]                           ;; f.y < o.y2
  mov ${lit(1)}, acu
  ret

  collision_corner_2:
  ;; if (f.x2 > o.x && f.x2 <= o.x2 && f.y >= o.y && f.y < o.y2)
  mov &[<CollisionPoints> FrogCollision.x2], acu
  mov &[<CollisionPoints> OtherCollision.x], r1
  jge r1, &[!collision_corner_3]                           ;; f.x2 > o.x
  mov &[<CollisionPoints> OtherCollision.x2], r1
  jlt r1, &[!collision_corner_3]                           ;; f.x2 <= o.x2
  mov &[<CollisionPoints> FrogCollision.y], acu
  mov &[<CollisionPoints> OtherCollision.y], r1
  jgt r1, &[!collision_corner_3]                           ;; f.y >= o.y
  mov &[<CollisionPoints> OtherCollision.y2], r1
  jle r1, &[!collision_corner_3]                           ;; f.y < o.y2
  mov ${lit(1)}, acu
  ret

  collision_corner_3:
  ;; if (f.x2 > o.x && f.x2 <= o.x2 && f.y2 > o.y && f.y2 <= o.y2)
  mov &[<CollisionPoints> FrogCollision.x2], acu
  mov &[<CollisionPoints> OtherCollision.x], r1
  jge r1, &[!collision_corner_4]                           ;; f.x2 > o.x
  mov &[<CollisionPoints> OtherCollision.x2], r1
  jlt r1, &[!collision_corner_4]                           ;; f.x2 <= o.x2
  mov &[<CollisionPoints> FrogCollision.y2], acu
  mov &[<CollisionPoints> OtherCollision.y], r1
  jgt r1, &[!collision_corner_4]                           ;; f.y2 >= o.y
  mov &[<CollisionPoints> OtherCollision.y2], r1
  jle r1, &[!collision_corner_4]                           ;; f.y2 < o.y2
  mov ${lit(1)}, acu
  ret

  collision_corner_4:
  ;; if (f.x >= o.x && f.x < o.x2 && f.y2 > o.y && f.y2 <= o.y2)
  mov &[<CollisionPoints> FrogCollision.x], acu
  mov &[<CollisionPoints> OtherCollision.x], r1
  jgt r1, &[!no_collision]                           ;; f.x >= o.x
  mov &[<CollisionPoints> OtherCollision.x2], r1
  jle r1, &[!no_collision]                           ;; f.x < o.x2
  mov &[<CollisionPoints> FrogCollision.y2], acu
  mov &[<CollisionPoints> OtherCollision.y], r1
  jgt r1, &[!no_collision]                           ;; f.y2 >= o.y
  mov &[<CollisionPoints> OtherCollision.y2], r1
  jle r1, &[!no_collision]                           ;; f.y2 < o.y2
  mov ${lit(1)}, acu
  ret

no_collision:
  mov ${lit(0)}, acu
  ret


after_frame:
  psh acu
  mov8 &[!hasEnded], acu
  jeq ${lit(0)}, &[!after_frame_2]
  mov8 ${lit(0)}, &[!hasEnded]
  pop acu
  pop r8
  psh [!start]
  rti

after_frame_2:
  pop acu
  rti

data8 hasEnded = { ${lit(0)} }
data8 carsOffset = { ${lit(0)} }
`.trim();
