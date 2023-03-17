import React, { createContext, useState, useContext } from 'react'

export const checkoutContext = createContext({
    restaurant: '',
    setRestaurant: () => { },
    restaurantInfo: {},
    setRestaurantInfo: () => { },
    cartQuantity: 0,
    setCartQuantity: () => { },
    cartHasItem: false,
    setCartHasItem: () => { },
    cartItems: [],
    setCartItems: () => { },
    checkDeclines: [],
    setCheckDeclines: () => { },
    discount: 0,
    setDiscount: () => { },
    cartHasPromo: false,
    setCartHasPromo: () => { },
    timer: 0,
    setTime: () => { },
    timeDisplay: "0:00",
    setTimeDisplay: () => { },
    pause: false,
    setPause: () => { },
    usedPromos: [],
    setUsedPromos: () => { },
    availableCredit: 0,
    setAvailableCredit: () => { },
    appliedCredit: 0,
    setAppliedCredit: () => { },
})

export default function CheckoutContext(props) {
    const [restaurant, setRestaurant] = useState('');
    const [restaurantInfo, setRestaurantInfo] = useState({});
    const [cartQuantity, setCartQuantity] = useState(0);
    const [cartHasItem, setCartHasItem] = useState(false);
    const [cartItems, setCartItems] = useState([]);
    const [checkDeclines, setCheckDeclines] = useState([]);
    const [discount, setDiscount] = useState(0);
    const [cartHasPromo, setCartHasPromo] = useState(false)
    const [timer, setTime] = useState(0);
    const [timeDisplay, setTimeDisplay] = useState("0:00");
    const [pause, setPause] = useState(false)
    const [usedPromos, setUsedPromos] = useState([])
    const [availableCredit, setAvailableCredit] = useState(0);
    const [appliedCredit, setAppliedCredit] = useState(0);

    const defaultCheckoutContext = {
        // Restaurant Info
        restaurant,
        setRestaurant: (restaurant) => setRestaurant(restaurant),

        restaurantInfo,
        setRestaurantInfo: (restaurantInfo) => setRestaurantInfo(restaurantInfo),

        // Cart Items
        cartQuantity,
        setCartQuantity: (quantity) => setCartQuantity(quantity),

        cartHasItem,
        setCartHasItem: (boolean) => setCartHasItem(boolean),

        cartItems,
        setCartItems: (items) => setCartItems(items),

        // Checks
        checkDeclines,
        setCheckDeclines,

        // Discount
        discount,
        setDiscount: (d) => setDiscount(d),

        // Promo
        cartHasPromo,
        setCartHasPromo: (b) => setCartHasPromo(b),

        // Timer
        timer,
        setTime: (v) => setTime(v),

        timeDisplay,
        setTimeDisplay: () => setTimeDisplay(fmtMSS(timer)),

        pause,
        setPause: () => setPause(),

        // Used Promos List
        usedPromos,
        setUsedPromos: (u) => setUsedPromos(u),

        // Credit
        availableCredit,
        setAvailableCredit: (ac) => setAvailableCredit(ac),

        appliedCredit,
        setAppliedCredit: (c) => setAppliedCredit(c)
    }

    return (
        <checkoutContext.Provider value={defaultCheckoutContext}>
            {props.children}
        </checkoutContext.Provider>
    )
}

function fmtMSS(s) {
    return (s - (s %= 60)) / 60 + (9 < s ? ':' : ':0') + s
}

export const useCheckout = () => useContext(checkoutContext);