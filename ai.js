/*

// Sample data - words and their corresponding labels (1 if contains 'a', 0 if not)
const data = [
    { word: "apple", label: 1 },
    { word: "banana", label: 1 },
    { word: "cherry", label: 0 },
    { word: "grape", label: 1 },
    { word: "pear", label: 1 },
    { word: "orange", label: 1 },
    { word: "kiwi", label: 0 },
    { word: "mango", label: 1 },
    { word: "strawberry", label: 1 },
    { word: "watermelon", label: 1 },
    { word: "blueberry", label: 1 },
    { word: "raspberry", label: 1 },
    { word: "pineapple", label: 1 },
    { word: "lemon", label: 0 },
    { word: "lime", label: 0 },
    { word: "peach", label: 1 },
    { word: "plum", label: 0 },
    { word: "apricot", label: 1 },
    { word: "blackberry", label: 1 },
    { word: "cranberry", label: 1 },
    { word: "fig", label: 0 },
    { word: "pomegranate", label: 1 },
    { word: "coconut", label: 0 },
    { word: "nectarine", label: 1 },
    { word: "dog", label: 0 },
    { word: "cat", label: 1 },
    { word: "chair", label: 1 },
    { word: "table", label: 1 },
    { word: "computer", label: 0 },
    { word: "book", label: 0 },
    { word: "car", label: 1 },
    { word: "bicycle", label: 0 },

    { word: "a", label: 1 },

    { word: "b", label: 0 },
  ];
  
  // Sigmoid activation function
  function sigmoid(x) {
    return 1 / (1 + Math.exp(-x));
  }
  
  // Logistic regression model training
  function trainLogisticRegression(data, learningRate, epochs) {
    let weight = 0; // Initialize weight
    let bias = 0; // Initialize bias
  
    for (let epoch = 0; epoch < epochs; epoch++) {
      for (const example of data) {
        const input = data.label
        const label = example.label;
  
        // Calculate predicted value
        const z = weight * input + bias;
        const prediction = sigmoid(z);
  
        // Calculate error
        const error = label - prediction;
  
        // Update weight and bias using gradient descent
        weight += learningRate * error * input;
        bias += learningRate * error;
      }
    }
  
    return { weight, bias };
  }
  
  // Test the trained model
  function predict(input, weight, bias) {
    const z = weight * input + bias;
    const prediction = sigmoid(z);
    return prediction >= 0.5 ? 1 : 0;
  }
  
  // Main function
  function main() {
    const learningRate = 0.6;
    const epochs = 100000;
  
    // Train the logistic regression model
    const { weight, bias } = trainLogisticRegression(data, learningRate, epochs);
  
    // Test the model on new words
    const testWords = ["pear", "pat", "john", "trex"];
  
    console.log('Trained Weight:', weight);
    console.log('Trained Bias:', bias);
  
    for (let word of testWords) {
      console.log(word.includes("a"))
      const input = word.includes('a') ? 1 : 0;
      const predictedLabel = predict(input, weight, bias);
      console.log(`Word: ${word}, Contains 'a': ${input === 1 ? 'Yes' : 'No'}, Predicted Label: ${predictedLabel === 1 ? 'Yes' : 'No'}`);
    }
  }

  // Create a canvas
const canvas = document.createElement('canvas');
canvas.width = 400;
canvas.height = 400;
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d');
let generations = 0;

// Define grid dimensions
const gridWidth = 10;
const gridHeight = 10;
const cellSize = canvas.width / gridWidth;

// Define agent and goal positions
let agentX = Math.floor(Math.random() * gridWidth);
let agentY = Math.floor(Math.random() * gridHeight);
const goalX = gridWidth - 1;
const goalY = Math.floor(Math.random() * gridHeight);

// Initialize Q-values
const qValues = new Array(gridWidth);
for (let i = 0; i < gridWidth; i++) {
  qValues[i] = new Array(gridHeight).fill(0);
}

// Learning parameters
const learningRate = .4;
const discountFactor = 0.9;
const explorationRate = 0.4;

// Perform Q-learning update
function qLearningUpdate(stateX, stateY, actionX, actionY, reward) {
  const oldValue = qValues[stateX][stateY];
  const bestNextAction = Math.max(qValues[actionX][actionY]);
  const newValue = (1 - learningRate) * oldValue + learningRate * (reward + discountFactor * bestNextAction);
  qValues[stateX][stateY] = newValue;
}

// Choose an action using epsilon-greedy policy
function chooseAction(stateX, stateY) {
  if (Math.random() < explorationRate) {
    return [Math.floor(Math.random() * gridWidth), Math.floor(Math.random() * gridHeight)];
  } else {
    return [qValues[stateX][stateY] > qValues[stateX - 1][stateY] ? stateX : stateX - 1, stateY];
  }
}

// Perform a single episode of learning
function learn() {
  let totalReward = 0;
  let currentStateX = agentX;
  let currentStateY = agentY;

  while (currentStateX > 0) {
    const [nextStateX, nextStateY] = chooseAction(currentStateX, currentStateY);
    const reward = nextStateX >= goalX && nextStateY === goalY ? 1 : 0;
    qLearningUpdate(currentStateX, currentStateY, nextStateX, nextStateY, reward);
    totalReward += reward 

    currentStateX = nextStateX;
    currentStateY = nextStateY;
  }


  return totalReward;
}

// Main loop
async function mainLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  generations ++; 

  // Draw agent
  ctx.fillStyle = 'blue';
  ctx.fillRect(agentX * cellSize, agentY * cellSize, cellSize, cellSize);

  // Draw goal
  ctx.fillStyle = 'green';
  ctx.fillRect(goalX * cellSize, goalY * cellSize, cellSize, cellSize);

  // Perform learning
  const totalReward = learn();

  // Update agent position
  agentX = Math.floor(Math.random() * gridWidth);
  agentY = Math.floor(Math.random() * gridHeight);

  // Display total reward
  ctx.fillStyle = 'black';
  ctx.fillText(`Total Reward: ${totalReward}`, 10, canvas.height - 10);

  ctx.fillStyle = 'black';
  ctx.fillText(`Generation: ${generations}`, 100, canvas.height - 10);
    await sleep (300)
  requestAnimationFrame(mainLoop);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
// Start the main loop
mainLoop();
main();
  

*/