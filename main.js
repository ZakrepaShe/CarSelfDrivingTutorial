const carCanvas = document.getElementById('carCanvas');
carCanvas.width = 200;

const networkCanvas = document.getElementById('networkCanvas');
networkCanvas.width = 300;

const carCtx = carCanvas.getContext('2d');
const networkCtx = networkCanvas.getContext('2d');

// car that passes test
const bestBrainTemplate = {
  'generation': 0,
  'name': 'starter',
  'levels': [
    {
      'inputs': [0, 0, 0, 0.15387562822175171, 0.4570564639624555],
      'outputs': [0, 1, 0, 1, 1, 0],
      'biases': [
        0.009563709437398364,
        -0.16903275614512386,
        0.11893750698758097,
        -0.19910802130976557,
        -0.11082521018612901,
        -0.10573207851973548,
      ],
      'weights': [
        [-0.161160838524639, -0.3544930785058219, -0.07855417802826495, 0.19075299226027387, 0.2123786147809834, -0.17300443314117506],
        [-0.37891118702435844, -0.209215470873786, -0.08744040947100375, 0.07538837973434466, -0.11241529102773198, -0.3724198127861447],
        [0.011769286980833626, -0.36132616330646455, 0.14487403397469284, -0.1222208305188672, 0.1381106363859591, -0.2797577294988251],
        [-0.12336381062537219, 0.19807674340117304, 0.23801863649439434, -0.2542334865311336, 0.13043974683130355, 0.019136244035907392],
        [-0.10539746129358349, 0.34094803481839364, 0.1541112185770661, -0.17180778745972852, -0.1041294974902611, -0.3415282041395236],
      ],
    }, {
      'inputs': [0, 1, 0, 1, 1, 0],
      'outputs': [1, 0, 0, 0],
      'biases': [-0.20604111723556723, 0.04938277262120842, -0.1692484689559584, 0.10101606733523848],
      'weights': [
        [-0.10511267190732577, -0.13385189272125297, 0.21044980832777577, 0.30576123619497403],
        [-0.021569237108136866, 0.015077498418592086, -0.4043836755958802, -0.05551100811717049],
        [0.013202105271898155, 0.2935590771509151, -0.47371769526564556, 0.1291975387835242],
        [0.09499394942563891, -0.14387328242598973, 0.16065239750141666, 0.04053609207990348],
        [0.3056446522395603, -0.24268690399573664, -0.13477031391042754, -0.18238308043841148],
        [0.450120590149047, 0.40933225707240084, -0.21777813967926646, 0.12361997204640979],
      ],
    }],
};

const N = 100;
const road = new Road(carCanvas.width / 2, carCanvas.width * 0.9);

let traffic = generateTraffic(road);
let cars = generateCars(N);
let bestCar = cars[0];
let winnerCars = [];

function generateCars(number) {
  return new Array(number).fill(0).map(() =>
    new Car(road.getLaneCenter(1), 100, 30, 50, 'AI'),
  );
}

function generateTraffic(road) {
  return [
    new Car(road.getLaneCenter(1), -100, 30, 50, 'DUMMY', 2),
    new Car(road.getLaneCenter(0), -300, 30, 50, 'DUMMY', 2),
    new Car(road.getLaneCenter(2), -300, 30, 50, 'DUMMY', 2),
    new Car(road.getLaneCenter(0), -500, 30, 50, 'DUMMY', 2),
    new Car(road.getLaneCenter(1), -500, 30, 50, 'DUMMY', 2),
    new Car(road.getLaneCenter(1), -700, 30, 50, 'DUMMY', 2),
    new Car(road.getLaneCenter(2), -700, 30, 50, 'DUMMY', 2),
  ];
}


function init() {
  cars = generateCars(N);
  traffic = generateTraffic(road);
  const storedBrains = localStorage.getItem('bestBrains');
  const preparedBrains = storedBrains ? JSON.parse(storedBrains) : [];
  let j = 1;

  cars.forEach((car, i) => {
    if (storedBrains && (i > (j * cars.length / preparedBrains.length))) {
      j++;
    }
    // keep 10 of total random, 85 mutated, 5 previous winners
    if(i < 90) {
      car.brain = storedBrains
        ? JSON.parse(JSON.stringify(preparedBrains[j - 1]))
        : JSON.parse(JSON.stringify(bestBrainTemplate))

      if (i%20 !== 0) {
        NeuralNetwork.mutate(car.brain, 0.05);
      }
    }
  });
}

init();
animate();

function save() {
  localStorage.setItem('bestBrains', JSON.stringify(winnerCars.map(({ brain }) => brain)));
}

function discard() {
  localStorage.removeItem('bestBrains');
}

function updateWinnerCars() {
  winnerCars = Object.values(
    cars
    .filter(({ damaged, speed, y }) => !damaged && speed !== 0 && y < -3000)
    .sort((a,b) => a.y - b.y)
    .reduce((acc, car) => ({...acc, [car.brain.name]: car}),{})
  )
}

function getFirstCar(carsArr) {
  return carsArr.reduce((firstCar, currentCar) => (currentCar.y < firstCar.y ? currentCar : firstCar))
}

function fitWinnerCars(neededLength) {
  if (winnerCars.length < neededLength) {
    for (let i = winnerCars.length; i < neededLength; i++) {
      winnerCars[i] = winnerCars[0];
    }
  } else {
    winnerCars = winnerCars.slice(0,neededLength);
  }
}

function animate(time) {
  if (getFirstCar(traffic).y < -3000 ) {
    updateWinnerCars();
    fitWinnerCars(5);
    save();
    carCtx.clearRect(0, 0, carCanvas.width, carCanvas.height);
    init();
  }

  traffic.forEach(trafficCar => {
    trafficCar.update(road.borders, []);
  });
  cars.forEach(car => {
    car.update(road.borders, traffic);
  });
  bestCar = getFirstCar(cars);

  carCanvas.height = window.innerHeight;
  networkCanvas.height = window.innerHeight;

  carCtx.save();
  carCtx.translate(0, -bestCar.y + carCanvas.height * 0.7);
  road.draw(carCtx);

  traffic.forEach(trafficCar => {
    trafficCar.draw(carCtx, 'red');
  });
  carCtx.globalAlpha = 0.2;
  cars.forEach(car => {
    car.draw(carCtx, 'blue');
  });
  carCtx.globalAlpha = 1;
  bestCar.draw(carCtx, 'blue', true);
  carCtx.restore();

  // Neural Network visualizer
  networkCtx.lineDashOffset = -time / 50;
  Visualizer.drawNetwork(networkCtx, bestCar.brain);
  requestAnimationFrame(animate);
}
