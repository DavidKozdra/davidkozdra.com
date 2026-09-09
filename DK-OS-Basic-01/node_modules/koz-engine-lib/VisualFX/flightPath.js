
var flightPathDic = {};

defineFlightPath("Straight", "p*TILESIZE", "0", 0.01, true);
defineFlightPath("Screw", "20*(cos((p*360*2)+180)+(p*3.5))", "20*sin(p*360*2)", 0.01, true);
defineFlightPath("Stay", "0", "0", 1, true);
defineFlightPath("Circle", "60*cos(p*360)", "60*sin(p*360)", 0.01, true);
defineFlightPath("FollowMouse", "(mouseX-lpX+camera.pos.x-(width/2))*p", "(mouseY-lpY+camera.pos.y-(height/2))*p", 0.01, true);

class FlightPath{
    constructor(sx,sy,a,eqX, eqY, calcRes, repeate = true){
        this.origin = createVector(sx,sy); //where the origonal path started
        this.s = createVector(sx,sy); //start of the path
        this.eqX = eqX;     //equation for x movement
        this.eqY = eqY;     //equation for y movement
        this.a = a;         //angle to rotate the equation
        this.calcRes = calcRes;
        this.repeate = repeate; //does this equation repeate?
        
        //stored for less computation
        this.cosA = cos(a); 
        this.sinA = sin(a);
        
        //set the last position to the starting position
        this.lp = this.s.copy();
        let lpX = this.lp.x;
        let lpY = this.lp.y;
        
        //get the starting offset of the flight path
        let p = 0;
        this.so = createVector(eval(this.eqX), eval(this.eqY));
        
        //calculate the length of the path, used in update to regulate speed
        this.calcL(calcRes);
        
        this.p = 0; //percentage of line youve already moved on
    }
    
    render(){ //renders a point at the current position of the flightpath
        push();
        let curPos = this.calc(this.p);
        stroke(0);
        strokeWeight(5);
        point(curPos.x, curPos.y);
        pop();
    }
    
    debugRender(stepSize, iterations, c){ //renders the path itself
        push();
        stroke(c);
        strokeWeight(2);
        let curPos = this.calc(0);
        this.lp = this.calc(0);
        
        //just draw a bunch of point along the path
        for(let i = 0; i < iterations; i += stepSize){ 
            point(curPos.x, curPos.y);
            
            curPos = this.calc(i);
            this.lp = curPos.copy();
        }
        pop();
    }
    
    update(d){ //d is how far down the path you want to move
        this.lp = this.calc(this.p);
        
        this.p += d/this.l;
        
        //no huge numbers for p if not needed
        if(this.p > 1 && this.repeate){
            this.s = this.calc(1);
            this.p = 0;
        }
        
        //update length when your p passes a new integer
        if(this.p-this.lastPcalced > 1 && !this.repeate){ 
            this.lastPcalced = this.p%1;
            this.calcL(this.calcRes);
        }
    }
    
    calc(p){
        let v = createVector(0,0);
        
        let lpX = this.lp.x;
        let lpY = this.lp.y;
        
        if(mouseX == this.lp.x){
            lpX -= 1;
        }
        if(mouseY == this.lp.y){
            lpY -= 1;
        }
        
        //stored for less computation
        let ex = eval(this.eqX);
        let ey = eval(this.eqY);
        
        //rotation math
        v.x = (ex - this.so.x)*this.cosA - (ey - this.so.y)*this.sinA + this.s.x;
        v.y = (ey - this.so.y)*this.cosA + (ex - this.so.x)*this.sinA + this.s.y;
        
        return v;
    }
    
    calcL(stepSize){
        this.l = 0;
        let lastPos = this.calc(0);
        let curPos;
        
        //take tiny steps and add up the length
        for(let i = stepSize; i < 1; i += stepSize){
            curPos = this.calc(i);
            this.l += curPos.dist(lastPos);
            
            lastPos = curPos.copy();
        }
        this.lastPcalced = 0;
    }
}

function defineFlightPath(name, eqX, eqY, calcRes, repeats = true){
    flightPathDic[name] = {
        name:name,
        eqX: eqX,
        eqY: eqY,
        calcRes: calcRes,
        repeats: repeats
    }
}

function createFlightPath(name,sx=0,sy=0,angle=0){
    if(flightPathDic[name] == undefined){
        throw new Error(`Flight Path with name: ${name}, does not exist`);
    }
    return new FlightPath(sx,sy,angle,flightPathDic[name].eqX,flightPathDic[name].eqY,flightPathDic[name].calcRes,flightPathDic[name].repeats);
}