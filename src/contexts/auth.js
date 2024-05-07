import React, { createContext, useState } from "react";

export const AuthContext = createContext({});

function AuthProvider({children}) {
    const [tempe1, setTempe1] = useState({});
    const [tempe2, setTempe2] = useState({});
    // const [tempo, setTempo] = useState({});

    function separar(params) {
        let j = params.length;
        let valor = "";
        let t, t1, t2;
        let aux=0, aux2=0;
        aux ++;
        for(let i=0; i<j; i++){
            valor = valor + String.fromCharCode(params[i]);
            if(String.fromCharCode(params[i])!='c' || String.fromCharCode(params[i])!='p'){
                aux2 = 0;
            }else if(String.fromCharCode(params[i])!=' '){
                aux2 = 1;
            }else if(String.fromCharCode(params[i])!=' '){
                aux2 = 2;
            }
            
            if(aux == 0){
                t = t + String.fromCharCode(params[i]);
            }else if(aux == 1){
                t1 = t1 + String.fromCharCode(params[i]);
            }else if(aux == 2){
                t2 = t2 + String.fromCharCode(params[i]);
            }
        }
        valor = aux + " " + valor + " " + valor;
        console.log(valor);
        console.log(t);
        setTempe1([...tempe1,
            {x: t,
            y: t1}
        ])
        console.log(t1);
        setTempe2([...tempe2,
            {x: t,
            y: t2}
        ])
        console.log(t2);
    }

    return(
        <AuthContext.Provider value={{tempe1, tempe2, separar}} >
            {children}
        </AuthContext.Provider>
    )
}

export default AuthProvider;