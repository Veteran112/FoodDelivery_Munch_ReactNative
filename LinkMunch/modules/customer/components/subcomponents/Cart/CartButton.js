import React, { useContext } from 'react';
import { View, StyleSheet } from 'react-native';
import RoundButton from '../RoundButton';
import { useCheckout } from '../../../context/CheckoutContext';

function CartButton(props) {
    let items = [...(useCheckout().cartItems.filter((thing) => {
        return thing.quantity > 0
    }))]

    let count = 0;
    for (let one of items) {
        if (one.quantity) {
            count += parseInt(one.quantity);
        } else {
            count += 1
        }
    }
    let itemNumber = items.length;
    let title = count.toString();
    return (
        <View
            style={{
                ...styles.footerWrapper,
                display: (useCheckout().cartHasItem || itemNumber > 0) ? 'flex' : 'none',
            }}>
            <RoundButton
                theme={'main'}
                enabled={true}
                title={`CART (` + title + `)`}
                style={{ backgroundColor: '#fb322d', borderRadius: 5, }}
                onPress={() => {
                    props.navigation.navigate('Cart')
                }}
                icon={{
                    name: 'cart',
                    type: 'ionicon',
                }}
            />
        </View>
    )
}

export default CartButton

const styles = StyleSheet.create({
    footerWrapper: {
        width: '100%',
        backgroundColor: 'white',
        padding: 10,
        borderColor: '#E2E2E2',
        marginBottom: 5,
    },
})