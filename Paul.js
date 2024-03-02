
        var vars = {
            TRUE:true
        }
        var heap = {}
        var stack = {}
        var line_pointer = 0;
        let library = {
        }
        library.define = (name, value) => {
            // Check if vars[value] exists
            if (vars.hasOwnProperty(value)) {
                // If vars[value] exists, set the variable with name to vars[value]
                vars[name] = vars[value];
            } else {
                // Initialize a stack to keep track of quotes
                let quoteStack = [];
        
                // Loop through each character of the value
                for (let i = 0; i < value.length; i++) {
                    let char = value[i];
                    // If the current character is a double quote
                    if (char === '"') {
                        // If the quote stack is empty or the top of the stack is not a double quote, push the current index onto the stack
                        if (quoteStack.length === 0 || quoteStack[quoteStack.length - 1] !== '"') {
                            quoteStack.push(i);
                        } else {
                            // If the top of the stack is a double quote, pop the index from the stack
                            quoteStack.pop();
                        }
                    }
                }
        
                // Check if there are any unmatched quotes in the stack
                if (quoteStack.length > 0) {
                    // If there are unmatched quotes, print an error message
                    console.log("?", line_pointer);
                    library.error(line_pointer, name + " is not known by Paul or can not be a string");
                } else {
                    // If all quotes are matched, allow setting the variable
                    vars[name] = value;
                }
            }
        }
        
        
        library.assign = (name, value) => {
            vars[name] = value
        }
        library.out = (toPrint) => {
       
        }
        

        library.push = (name, value) => {
            stack[name] = value
        }

        library.pop = (name) => {
            console.log(stack[name])
        }

        library.define_func = (name, value) => {
            //example defFunc a,b,c,d,e a+b+c+d+e
            so = value.split(' ')
            let params = so[1].split(',')
            let body = so[2]
            library[name] = (...args) => {
                
            }
        }

        library.clear = () => {
        }

        library.error = (line, message) => {
            console.log("ERROR in paul lib  ", message)
            out("# "+ line + "message : " +message)
        }

        library.help = () => {  
            Object.keys(library).forEach(key => {
                if (typeof library[key] === 'function') {
                    out(`Function name: ${key}`);
                }
            });
            
        }


        // should be able to find that x+y will be the value
        // that TRUE will be TRUE , that our vars are true
        library.exec = (params) =>{
            // parse all the params from space
            // check for varibles
            // find order of operators
            // use postfix or prefix
            //return the value 

            //should be able to define from exec
            console.log("?");
        }

        function mapLibToCode(command, params) {
            if (command === " " || command === null || command == "" ) {
                console.log("|"+ command + "|")
                return
            }
            //remove all spaces from the command
            command = command.trim()

            if (library[command] === undefined) {
                // might need just an output var that can be added to and then outed, how to make it read js vars by default 
                library.error(line_pointer, "command |" + command+ "|  not found not recognized or other")
                console.log(line_pointer)
                return
            }
            // ie the command in lib of the same name then call it with the params destructured
            // ie mapping them to the function arguments
            library[command](...params)
        }

        let code = `
            define,x,10;
            out,x;
            assign,x,20;
            out,x;
            clear;
            max;
            `

        function execute(code ) {
            code = `${code}`
            console.log(code)
            let lines = code.split(';').filter(line => line.trim() !== '');

            // Remove the last element from the array if it's empty
            if (lines.length > 0 && lines[lines.length - 1].trim() === '') {
                lines.pop();
            }

            for (let i = 0; i < lines.length; i++) {
                let line = lines[i].trim(); // Trim any leading or trailing whitespace
                if (line === '') {
                    continue; // Skip empty lines
                }
                let [command, ...params] = line.split(/\s+/); // Split the line by whitespace
                mapLibToCode(command, params);
                line_pointer = i; // Set the line pointer after processing the line
            }
            
        }

        execute(code)
        //console.log(vars)
        //console.log(heap)