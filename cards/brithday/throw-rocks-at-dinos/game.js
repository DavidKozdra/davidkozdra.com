let circles= []

let enemies = []
let angle = 0

async function setup() {
  createCanvas(1000, 1000);
  rectMode(CENTER);

  img = await loadImage('/gun.jpg');

  // Draw the image.
  image(img, 0, 0);

    setInterval(()=> {
    //spawn enemy
    enemies.push({x:random([0, 20]),y:random([0, 20]), w:100,h:100})
    console.log("en")
  }, 500)
}

function draw() {
  background(220);

   push()
   translate(width / 2, height / 2);

  angle = atan2(
    mouseY - height / 2,
    mouseX - width / 2
  );

  rotate(angle);

    rotate(360);
    image(img, 0, 0);
  pop()


  // update bullets
  for(let i =0; i < circles.length; i++){
    let c = circles[i]
    circle(c.x,c.y,10)
    c.x += 10 * c.dx
      c.y += 10 * c.dy
  }
  
   for(let i =0; i < enemies.length; i++){
  
     for(let b =0; b < circles.length; b++){
          let e = enemies[i]
          let bu = circles[b]
         rect(e.x,e.y,40,40)
  
        if(circleRectCollision(e,bu)){
            circles.splice(i,1)
            enemies.splice(i,1)
        }
     }
   }

  
}

// Toggle the square's color when the user clicks.
function mouseClicked() {

  let dx = cos(angle)
  let dy = sin(angle)
  
  circles.push({x:width/2,y:height/2,dx,dy})
}

function circleRectCollision(ball, rect) {
  let radius = ball.size / 2;

  let closestX = constrain(
    ball.x,
    rect.x,
    rect.x + rect.w
  );

  let closestY = constrain(
    ball.y,
    rect.y,
    rect.y + rect.h
  );

  let distance = dist(
    ball.x,
    ball.y,
    closestX,
    closestY
  );

  return distance <= radius;
}


function rectRectCollision(rect1, rect2) {
  return (
    rect1.x < rect2.x + rect2.w &&
    rect1.x + rect1.w > rect2.x &&
    rect1.y < rect2.y + rect2.h &&
    rect1.y + rect1.h > rect2.y
  );
}

function resetBall() {
  Ball.x = width / 2;
  Ball.y = height / 2;

  Ball.dirX = random([-2, 2]);
  Ball.dirY = -2;
}