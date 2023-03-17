import React, { Component } from 'react';
import { View, StyleSheet, Text, Image, TouchableOpacity, Dimensions, Alert } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import Toast from 'react-native-easy-toast';

import Styles from "../../../theme/Styles";
import Images from "../../../theme/Images";
import RoundTextInput from "./RoundTextInput";
import RoundButton from "./RoundButton";
import Stripe from "tipsi-stripe";
import config from "../../config";
import { Auth } from "aws-amplify";
import Loading from "react-native-loading-spinner-overlay";
import { checkoutContext } from '../../context/CheckoutContext';

export default class CheckoutScreen extends Component {
    static contextType = checkoutContext;
    constructor() {
        super();
        this.state = {
            isLoading: false,
            restaurant: null,
            profile: null,
            menuItems: [],
            promoItems: [],
            promoCode: '',
            discount: 0,
            appliedCredit: 0,
            comment: '',
            selectedAddress: null,
            selectedPayment: null,

            isShowPaymentSheet: false,
            isShowAddressSheet: false,

            usedPromos: []
        };
    }

    componentDidMount() {
        this.focusListener = this.props.navigation.addListener(
            'focus',
            this.willFocusPage,
        );
    }

    componentDidUpdate(prevProps, prevState) {
    }

    componentWillUnmount() {
        this.focusListener();
    }

    willFocusPage = () => {
        if (this.props.route && this.props.route.params) {
            const { restaurant, profile, items, promoCode, payment } = this.props.route.params;
            if (profile && profile.customerInfo && profile.customerInfo.address) {
                this.setState({ selectedAddress: profile.customerInfo.address });
            }
            if (this.props.route.params.promoItems) {
                this.setState({ promoItems: this.props.route.params.promoItems })
            }
            this.setState({ restaurant, profile, menuItems: items, promoCode, selectedPayment: payment });
        }
    }

    ////////////////////////////////////////////////////////////////////////////
    ////////////////////////////// Content //////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////
    _renderContent() {
        const { restaurant, profile, selectedPayment, selectedAddress, comment, promoCode, isShowPaymentSheet, isShowAddressSheet, discount, appliedCredit } = this.state;
        const restaurantName = restaurant ? restaurant.Profile.restaurantInfo.restaurantName : '';
        return (
            <View style={styles.contentWrapper}>
                <View style={styles.itemWrapper}>
                    <View style={Styles.rowCenter}>
                        <Image style={styles.itemImage} source={Images.icon_order} />
                        <Text style={styles.itemTitleText}>{`My Order${promoCode != '' ? ' (with Discount!)' : ''}`}</Text>
                    </View>
                    <View style={[Styles.rowCenterBetween, styles.border]}>
                        <View style={Styles.rowCenter}>
                            <Image style={styles.contentImage} source={Images.icon_location} />
                            <Text style={styles.contentText}>{restaurantName}</Text>
                        </View>
                        <Text style={styles.priceText}>${this.getTotal()}</Text>
                    </View>
                </View>
                <TouchableOpacity style={styles.itemWrapper} onPress={this.onSelectAddress}>
                    <View style={Styles.rowCenter}>
                        <Image style={styles.itemImage} source={Images.icon_location} />
                        <Text style={styles.itemTitleText}>Delivery Address</Text>
                    </View>
                    {selectedAddress ?
                        (
                            <View style={[Styles.rowCenterBetween, styles.border]}>
                                <Text style={styles.contentText}>{selectedAddress.address}</Text>
                            </View>
                        ) : null
                    }
                </TouchableOpacity>
                <View style={styles.itemWrapper}>
                    <View style={Styles.rowCenter}>
                        <Image style={styles.itemImage} source={Images.icon_card} />
                        <Text style={styles.itemTitleText}>Payment Method</Text>
                    </View>
                    {selectedPayment ?
                        (
                            <View style={[Styles.rowCenterBetween, styles.border]}>
                                <Text style={styles.contentText}>xxxx xxxx xxxx {selectedPayment.card.last4}</Text>
                            </View>
                        ) : null
                    }
                </View>
                <View style={styles.itemWrapper}>
                    <RoundTextInput
                        label={'COMMENT'}
                        type="textview"
                        value={comment}
                        returnKeyType="done"
                        onChangeText={text => this.setState({ comment: text })}
                        onSubmitEditing={this.onSendOrder}
                    />
                </View>
            </View>
        )
    }

    onSelectAddress = () => {
        this.setState({ isShowAddressSheet: true });
    }

    onSelectPayment = () => {
        this.setState({ isShowPaymentSheet: true });
    }

    onChangeAddress = (item) => {
        this.setState({ selectedAddress: item, isShowAddressSheet: false });
    }

    onChangePayment = (item) => {
        this.setState({ selectedPayment: item, isShowPaymentSheet: false });
    }

    ////////////////////////////////////////////////////////////////////////////
    ////////////////////////////// Footer //////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////
    _renderFooter() {
        return (
            <View style={styles.footerWrapper}>
                <RoundButton
                    style={{
                        backgroundColor: '#fb322d',
                        borderRadius: 5
                    }}
                    theme={'main'}
                    enabled={true}
                    title={'CONFIRM ORDER'}
                    onPress={this.onSendOrder}
                />
            </View>
        )
    }

    onSendOrder = () => {
        const { selectedPayment, menuItems, restaurant, profile, promoCode, promoItems } = this.state;
        if (!selectedPayment) {
            this.toast.show('Please select a payment card.', 2000);
            return;
        }
        // CAUTION ON THIS *100 TEMP SOLUTION FOR STRIPE PAYMENT SUCCESS
        let total = Math.trunc(this.getTotal() * 100)
        const restaurantName = restaurant ? restaurant.Profile.restaurantInfo.restaurantName : '';
        const restaurantInfo = restaurant && restaurant.Profile.restaurantInfo ? restaurant.Profile.restaurantInfo : null;
        const items = [];
        for (const menu of menuItems) {
            if (menu.quantity > 0) {
                items.push({
                    item: menu.item_name,
                    quantity: menu.quantity,
                    instructions: menu.instructions,
                    price: menu.item_price * menu.quantity,
                });
            }
        }
        for (const menu of promoItems) {
            if (menu.quantity > 0) {
                items.push({
                    item: menu.title,
                    quantity: menu.quantity,
                    instructions: menu.instructions,
                    price: menu.discount * menu.quantity
                })
            }
        }

        try {
            Alert.alert(
                'Confirm',
                'Are you sure you want to pay for this order?',
                [
                    {
                        text: 'Yes',
                        onPress: () => {
                            this.setState({ isLoading: true });
                            Stripe.setOptions({ publishableKey: config.pk_test });
                            Auth.currentUserInfo().then(async (info) => {
                                let data
                                if (total > 0) {
                                    const body = {
                                        amount: total,
                                        token: selectedPayment.tokenId,
                                        description:
                                            info.username + ' has purchased ' + restaurantName,
                                    };

                                    const response = await fetch(
                                        'https://veml8u1rjb.execute-api.us-west-1.amazonaws.com/beta/payment',
                                        {
                                            method: 'POST', // *GET, POST, PUT, DELETE, etc.
                                            mode: 'cors', // no-cors, *cors, same-origin
                                            cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
                                            credentials: 'same-origin', // include, *same-origin, omit
                                            headers: {
                                                'Content-Type': 'application/json',
                                                'Connection': 'keep-alive',
                                            },
                                            redirect: 'follow', // manual, *follow, error
                                            referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
                                            body: JSON.stringify(body), // body data type must match “Content-Type” header
                                        },
                                    );
                                    data = await response.json();
                                    console.log('payment =====>', data);
                                }
                                if (total <= 0 || data.statusCode === 200) {
                                    let usedPromosBody = {
                                        incoming_id: info.username,
                                        credit: this.context.appliedCredit
                                    };

                                    const usedPromos = await fetch(
                                        'https://9yl3ar8isd.execute-api.us-west-1.amazonaws.com/beta/getUserPromoInformation',
                                        {
                                            method: 'POST', // *GET, POST, PUT, DELETE, etc.
                                            mode: 'cors', // no-cors, *cors, same-origin
                                            cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
                                            credentials: 'same-origin', // include, *same-origin, omit
                                            headers: {
                                                'Content-Type': 'application/json',
                                                'Connection': 'keep-alive',
                                            },
                                            redirect: 'follow', // manual, *follow, error
                                            referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
                                            body: JSON.stringify(usedPromosBody), // body data type must match “Content-Type” header
                                        },
                                    );

                                    let newUsedPromos = await usedPromos.json()
                                    this.context.setUsedPromos(newUsedPromos)

                                    let orderDetail = {
                                        incomingId: info.username,
                                        order: {
                                            customerName:
                                                profile.customerInfo.customerName.firstName +
                                                ' ' +
                                                profile.customerInfo.customerName.lastName,
                                            restaurantId: restaurant.RestaurantId,
                                            restaurantName: restaurantName,
                                            menuId: '',
                                            menuItems: items,
                                            promoBought: [...promoItems],
                                            referralCode: promoCode,
                                            orderTotal: total,
                                            timeOrderPlaced: new Date(),
                                            status: 'Awaiting Confirmation',
                                            timeOrderCompleted: '',
                                            comment: this.state.comment
                                        },
                                    };

                                    console.log('submit order =====>', orderDetail);

                                    let response = await fetch(
                                        'https://9yl3ar8isd.execute-api.us-west-1.amazonaws.com/beta/setuporders',
                                        {
                                            method: 'POST', // *GET, POST, PUT, DELETE, etc.
                                            mode: 'cors', // no-cors, *cors, same-origin
                                            cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
                                            credentials: 'same-origin', // include, *same-origin, omit
                                            headers: {
                                                'Content-Type': 'application/json',
                                                'Connection': 'keep-alive',
                                            },
                                            redirect: 'follow', // manual, *follow, error
                                            referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
                                            body: JSON.stringify(orderDetail),
                                        },
                                    );

                                    this.props.navigation.popToTop();

                                    this.props.navigation.navigate('Orders');
                                } else {
                                    Alert.alert('Payment has failed');
                                }
                                this.setState({ isLoading: false });
                                this.context.setRestaurant('');
                                this.context.setRestaurantInfo({});
                                this.context.setCartItems([]);
                                this.context.setCartQuantity(0);
                                this.context.setCartHasItem(false);
                                this.context.setCartHasPromo(false);
                                this.context.setDiscount(0);
                                this.context.setTime(0);
                            });
                        },
                    },
                    { text: 'No' },
                ],
                { cancelable: false },
            );

        } catch (e) {
            this.setState({ isLoading: false });
        }
    }

    getTotal() {
        const { menuItems, promoItems, promoCode } = this.state;
        let subtotal = 0;
        let delivery = 0;
        let discount = parseFloat(this.context.discount);
        let appliedCredit = this.context.appliedCredit;

        for (const item of menuItems) {
            if (item.item_price != "NaN") {
                subtotal += (parseFloat(item.item_price) * item.quantity);
            }
        }
        for (const item of promoItems) {
            if (item.item_price != "NaN") {
                subtotal += (parseFloat(item.discount) * item.quantity)
            }
        }
        let total = parseFloat((subtotal + delivery - discount - appliedCredit).toFixed(2));
        return total;
    }

    ////////////////////////////////////////////////////////////////////////////
    ////////////////////////////// Render //////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////
    render() {
        const { isLoading, restaurant } = this.state;
        return (
            <View style={{ flex: 1, backgroundColor: '#EFF3FC' }}>
                <SafeAreaInsetsContext.Consumer>
                    {insets => (
                        <View style={{ flex: 1 }}>
                            <View style={styles.container}>
                                {restaurant &&
                                    <>
                                        {this._renderContent()}
                                        {this._renderFooter()}
                                    </>
                                }
                            </View>
                        </View>
                    )}
                </SafeAreaInsetsContext.Consumer>
                <Toast ref={ref => (this.toast = ref)} />
                <Loading visible={isLoading} />
            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentWrapper: {
        flex: 1,
        padding: 15
    },
    border: {
        marginHorizontal: 30,
        paddingBottom: 5,
        borderColor: '#E2E2E2',
        borderBottomWidth: 1,
        marginTop: 10
    },
    itemWrapper: {
        paddingVertical: 10
    },
    itemImage: {
        width: 20,
        height: 20,
        resizeMode: 'contain'
    },
    itemTitleText: {
        fontSize: 18,
        color: '#222222',
        marginLeft: 10
    },
    contentImage: {
        width: 14,
        height: 14,
        resizeMode: 'contain'
    },
    contentText: {
        fontSize: 15,
        color: '#7D849A',
        marginLeft: 10
    },
    priceText: {
        color: '#E83939',
        fontSize: 18
    },
    footerWrapper: {
        backgroundColor: 'white',
        padding: 10,
        borderBottomWidth: 1,
        borderColor: '#E2E2E2',
    }
});