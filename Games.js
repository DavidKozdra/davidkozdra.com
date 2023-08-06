const canvasA = document.getElementById('a');
const canvasB = document.getElementById('b');
const canvasC = document.getElementById('c');

const ctxA = canvasA.getContext('2d');
const ctxB = canvasB.getContext('2d');
const ctxC = canvasC.getContext('2d');
let camera = {x:150,y:50}
let player = {x:canvasA.width / 2,y:canvasA.height / 2, w:10,h:10}
let circleY = canvasB.height / 2;

let mouseX=100;
let mouseY=100;
let clicked = false;
let points =0;
let collectables = []
let grid = []

class collectable {
  
  constructor (x,y,w,h){
    this.x =x
    this.y =y
    this.w = w;
    this.h = h;
    this.dx = .1 *(getRandomInt(3) == 2) ? -1 : .2;
    this.dy = .1*(getRandomInt(3) == 2) ? -1 : .2;;
  }

  render(){
    ctxA.fillStyle = 'green';
    ctxA.fillRect(this.x, this.y, this.w, this.h);
  }

  ontouch() {

  }

}

class entity {
  
  constructor (x,y,alive){
    this.x = x;
    this.y = y;
    this.alive=alive;
    this.futureStatus;
  }


}

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

canvasC.addEventListener("keydown", handleKeyDown);
canvasA.addEventListener("mousedown", getMouse);
function handleKeyDown(event) {
  // Check the keyCode of the pressed key

  if(event.keyCode == 65 && knight.x > 0){
    knight.x -= 20;
  }
  else if (event.keyCode ==68 && knight.x < 270) {
    knight.x+= 20;
  }
  else if (event.keyCode == 87 && knight.y > 20){
    knight.y -= 20;
  }else if (event.keyCode ==83 && knight.y < 120) {
    knight.y += 20;
  }
}

function getMouse(event) {
  const rect = canvasA.getBoundingClientRect();
  const scaleX = canvasA.width / rect.width;
  const scaleY = canvasA.height / rect.height;
  mouseX = (event.clientX - rect.left) * scaleX- 5;
  mouseY = (event.clientY - rect.top) * scaleY - 5;
  // Use the mouseX and canvas dimensions to adjust player movement
  clicked = true;
  
}


function isColliding(player,other) {
  let { x: x1, w: w1, y: y1, h: h1 } = player;
  let { x: x2, w: w2, y: y2, h: h2 } = other;

  // Check x and y for overlap
  if (x2 > w1 + x1 || x1 > w2 + x2 || y2 > h1 + y1 || y1 > h2 + y2){
      return false;
  }
  return true;
}

function renderPoints(){
  ctxA.fillStyle = "black"
  ctxA.fillText( "Points "+ points, 200,15);

}

function drawGame1() {
  if(points == 1000){
    ctxA.fillText("YOU FREAKING WIN I am so impressed and proud of you play my other games gaming legend ", 100 ,100);

  }else {
    
  ctxA.clearRect(0, 0, canvasA.width, canvasA.height);
  ctxA.fillStyle = 'red';
  ctxA.fillRect(player.x, player.y, player.w, player.h);
  
  player.x -= (player.x - mouseX) * .1;
  player.y -= (player.y - mouseY) * .1;

  
  for(var i =0; i < collectables.length; i++){
    collectables[i].render();

    if(collectables[i].x > 200 || collectables[i].x <= 0){
      collectables[i].dx*= -1
    }
    if(collectables[i].y > 200 || collectables[i].y < 0){
      collectables[i].dy *= -1
    }

    collectables[i].x += collectables[i].dx;
    collectables[i].y += collectables[i].dy;

    if(isColliding(player,collectables[i])){
       // remove the collectable
      collectables.splice(i,1);
      player.h +=.5;
      player.w +=.5;
      points+=1;
    } 
  }

  if(collectables.length<200){
    collectables.push(new collectable(getRandomInt(canvasA.width),getRandomInt(canvasA.width),2,2))
  }  
  renderPoints();

  if(!clicked){
    ctxA.fillStyle = 'black';
    const amplitude = 20; // Adjust the amplitude of the oscillation
    const frequency = 0.002; // Adjust the frequency of the oscillation
    const oscillation = amplitude * Math.sin(frequency * Date.now());
    ctxA.font = "20px Arial";
    ctxA.fillText("Click to pick up food", 10, oscillation+50);
  }
  

}
  requestAnimationFrame(drawGame1);
}


let gridSize =15;
let gen = 0;
let entities = [];

for (var i =0; i < gridSize; i++){
  for(var j =0; j < gridSize; j++){
    //getRandomInt(3)==2
    entities.push(new entity(i*gridSize,j*gridSize,getRandomInt(3)==2))
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function drawCircle() {
  ctxB.clearRect(0, 0, canvasB.width, canvasB.height);

  for (var i = 0; i < entities.length; i++) {
    let n = 0;
    let { x, y } = entities[i];

    for (var j = 0; j < entities.length; j++) {
      let ox = entities[j].x;
      let oy = entities[j].y;

      // Skip non-alive entities and the cell itself
      if (!entities[j].alive || (x==ox && y==oy)) {
        continue;
      }
      if ((x + 15 === ox && y + 15 === oy) || (x - 15 === ox && y - 15 === oy) ||(x === ox && y - 15 === oy) || (x === ox && y + 15 === oy) ||(x === ox && y + 15 === oy)) {
        n += 1;
      }
      if (Math.abs(x - ox) <= 1 && Math.abs(y - oy) <= 1 && !(x === ox && y === oy)) {
        console.log("???")
      } 
    }
    if ((entities[i].alive && (n === 2 || n === 3)) || (!entities[i].alive && n === 3)) {
      entities[i].futureStatus = true; // Cell lives in the next generation
    } else {
      entities[i].futureStatus = false; // Cell dies in the next generation
    }
    
    // Draw cells
    ctxB.fillStyle = entities[i].alive ? "green" : "grey";
    ctxB.fillRect(x, y, gridSize - 1, gridSize - 1);
    ctxB.font = "10px Arial";
    ctxB.fillStyle = "white";
    ctxB.fillText(n, x+1.5, y-7);
  }

  // Update entities based on futureStatus
  for (var i = 0; i < entities.length; i++) {
    entities[i].alive = entities[i].futureStatus;
    entities[i].futureStatus = false; // Reset futureStatus
  }

  gen += 1;

  ctxB.fillStyle = 'black';
  ctxB.fillText("Gen: " + gen, 250, 147);
  ctxB.fill();

  await sleep(2000); // Sleep for 2000 milliseconds (2 seconds)
  requestAnimationFrame(drawCircle);
}


let knight = {x:100,y:50,health:5}

function rougeLike(){
  

  ctxC.clearRect(0, 0, canvasC.width, canvasC.height);
  ctxC.fillStyle = 'red';
  ctxC.fillRect(knight.x, knight.y, 20,20);
  
  requestAnimationFrame(rougeLike);
}

drawGame1();
drawCircle();
rougeLike();