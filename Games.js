const canvasA = document.getElementById('a');
const canvasB = document.getElementById('b');

const ctxA = canvasA.getContext('2d');
const ctxB = canvasB.getContext('2d');

let rectX = 0;
let circleY = canvasB.height / 2;

function drawRectangle() {
  ctxA.clearRect(0, 0, canvasA.width, canvasA.height);
  ctxA.fillStyle = 'red';
  ctxA.fillRect(rectX, canvasA.height / 4, 50, 50);

  // Move the rectangle left and right
  rectX += 1;
  if (rectX > canvasA.width) {
    rectX = -50;
  }

  requestAnimationFrame(drawRectangle);
}

function drawCircle() {
  ctxB.clearRect(0, 0, canvasB.width, canvasB.height);
  ctxB.fillStyle = 'blue';
  ctxB.beginPath();
  ctxB.arc(canvasB.width / 2, circleY, 25, 0, 2 * Math.PI);
  ctxB.fill();

  // Move the circle up and down
  circleY += 1;
  if (circleY > canvasB.height + 25) {
    circleY = -25;
  }

  requestAnimationFrame(drawCircle);
}

drawRectangle();
drawCircle();
