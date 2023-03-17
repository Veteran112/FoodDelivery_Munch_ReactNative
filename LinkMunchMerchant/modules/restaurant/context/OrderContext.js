import React, { createContext, useState, useContext } from 'react'

export const orderContext = createContext({
    checkOrderDetails: [],
    setCheckOrderDetails: () => { },
    checkBeingPreapred: [],
    setCheckBeingPrepared: () => { },
});

export default function OrderContext(props) {
    const [checkOrderDetails, setCheckOrderDetails] = useState([]);
    const [checkBeingPreapred, setCheckBeingPrepared] = useState([]);

    const provider = {
        checkOrderDetails,
        setCheckOrderDetails,
        checkBeingPreapred,
        setCheckBeingPrepared
    }

    return (
        <orderContext.Provider value={{ provider }}>
            {props.children}
        </orderContext.Provider>
    )
}

export const useOrder = () => useContext(orderContext);