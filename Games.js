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
  }

  render(){
    ctxA.fillStyle = 'green';
    ctxA.fillRect(this.x, this.y, this.w, this.h);
  }

  ontouch() {

  }

}

class entity {
  
  constructor (x,y){
    this.x = x;
    this.y = y;
  }

  render(){
    ctxA.fillStyle = 'green';
    ctxA.fillRect(this.x, this.y, 19, 19);
  }

}

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

canvasC.addEventListener("keydown", handleKeyDown);
canvasA.addEventListener("mousedown", getMouse);
function handleKeyDown(event) {
  // Check the keyCode of the pressed key
  switch (event.keyCode) {
    case 37: // Left arrow
      knight.x -= 10;
      break;
    case 38: // Up arrow
    knight.y -= 10;
      break;
    case 39: // Right arrow
    knight.x+= 10;
      break;
    case 40: // Down arrow
    knight.y += 10;
      break;
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
    return;
  }

  ctxA.clearRect(0, 0, canvasA.width, canvasA.height);
  ctxA.fillStyle = 'red';
  ctxA.fillRect(player.x, player.y, player.w, player.h);
  
  player.x -= (player.x - mouseX) * .1;
  player.y -= (player.y - mouseY) * .1;

  if(!clicked){
    ctxA.fillStyle = 'black';
    const amplitude = 20; // Adjust the amplitude of the oscillation
    const frequency = 0.002; // Adjust the frequency of the oscillation
    const oscillation = amplitude * Math.sin(frequency * Date.now());
    ctxA.font = "20px Arial";
    ctxA.fillText("Click to pick up food", 10, oscillation+50);
  }
  
  for(var i =0; i < collectables.length; i++){
    collectables[i].render();

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

  requestAnimationFrame(drawGame1);
}


let gridSize =20;
let gen = 0;
let entities = [];



function drawCircle() {
  ctxB.clearRect(0, 0, canvasB.width, canvasB.height);
  for(var i=0; i < gridSize; i++){
    ctxB.fillStyle = 'grey';
    for(var j=0; j < gridSize *.32; j++){
      ctxB.fillRect(i*gridSize, j*gridSize, gridSize-1, gridSize-1);

      
  /*
  If the cell is alive, then it stays alive if it has either 2 or 3 live neighbors
If the cell is dead, then it springs to life only in the case that it has 3 live neighbors

  for each grid
    check if there is an entity in the entity list
    
  */
      for(var current=0; current < entities.length; current ++){
          if(entities[current].x == i*gridSize){

          }


      }
    }
  }
  
  
  ctxB.fillStyle = 'black';
  ctxB.fillText("Gen: " + gen, 0,147);
  ctxB.fill();
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