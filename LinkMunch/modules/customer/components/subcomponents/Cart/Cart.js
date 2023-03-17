import React, { Component, useState, useContext } from 'react';
import { View, StyleSheet, Keyboard, Text, Image, TouchableOpacity, Dimensions, Button } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-easy-toast';
import { SwipeListView } from 'react-native-swipe-list-view';
import { CheckBox } from 'react-native-elements';
import { CreditCardInput } from 'react-native-input-credit-card';
import RBSheet from 'react-native-raw-bottom-sheet';
import { checkoutContext } from '../../../context/CheckoutContext';
import { timerContext } from "../../../context/TimerContext"
import Styles from "../../../../theme/Styles";
import Images from "../../../../theme/Images";
import RoundTextInput from "../RoundTextInput";
import RoundButton from "../RoundButton";
import { Icon } from "react-native-elements";
import Stripe from "tipsi-stripe";
import config from "../../../config";
import Loading from "react-native-loading-spinner-overlay";
import { updateDynamoCustomer } from '../ProfileEditor/updateDynamoCustomer';
import CountDown from 'react-native-countdown-component';
import Timer from "../Timer/Timer"


const sWidth = Dimensions.get('window').width;

export default class MyOrdersScreen extends Component {
    static contextType = checkoutContext;
    constructor(props) {
        super();
        this.state = {
            isLoading: false,
            restaurant: {},
            profile: props.route.params.profile,
            menuItems: [],
            promoCode: '',
            promoCodeError: '',
            restaurantMenu: {},
            cardForm: null,
            cardError: null,
            isShowSelectPaymentModal: false,
            selectedIndex: 0, // ***123, another card
            total: 0,
            discount: 0,
            credit: parseFloat(props.route.params.profile.credit) ?? 0,
            appliedCredit: 0,
            applyCredit: false,
            usedPromos: props.route.params.usedPromos,
            customerId: props.route.params.customerId
        };
    }


    async componentDidMount() {
        const menuItemsInCart = this.context.cartItems
        const appliedCredit = this.context.appliedCredit
        const creditMinusApplied = this.state.credit > appliedCredit ? this.state.credit - appliedCredit : 0
        this.setState({ restaurant: this.context.restaurantInfo, menuItems: menuItemsInCart, credit: creditMinusApplied, cardForm: null });
        // _retrieveData()
    }

    componentDidUpdate(prevProps, prevState) {
    }

    willFocusPage = () => { }

    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    ////////////////////////////////////////////////////////////////////////////
    ////////////////////////////// Restaurant //////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////


    ////////////////////////////////////////////////////////////////////////////
    ////////////////////////////// Menus //////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////
    _renderMenuTabs() {

    }

    _renderMenus() {
        const { restaurant, menuItems, profile, restaurantMenu } = this.state;
        return (
            <View style={{ flex: 1, flexGrow: 1, marginTop: 15, }}>
                {/* MENU ITEMS */}
                <SwipeListView
                    style={{ ...styles.listContainer, minHeight: '25%', }}
                    data={[...(menuItems.filter((thing) => thing.quantity > 0))]}
                    showsVerticalScrollIndicator={true}
                    keyExtractor={(item, index) => {
                        if (item.title) {
                            return index + menuItems.length;
                        } else {
                            return index
                        }
                    }}
                    renderItem={({ item, index }) => {
                        const menuImage = item.picture ? { uri: item.picture } : item.content_id ? { uri: item.content_id } : Images.icon_food_placeholder;
                        const menuTitle = item.item_name ? item.item_name : item.title ? item.title : '';
                        const price = item.item_price != "NaN" ? parseFloat(item.item_price) : item.discount ? item.discount : 0.00;
                        const quantity = item.quantity ? item.quantity : 0;
                        return (
                            <View style={styles.menuWrapper}>
                                <Image style={styles.menuImage} source={menuImage} />
                                <View style={styles.menuInfo}>
                                    <Text style={styles.menuTitleText}>{menuTitle}</Text>
                                    <View style={styles.priceWrapper}>
                                        <Text style={styles.menuPriceText}>${price.toFixed(2)}</Text>
                                        {item.item_name && (
                                            <View style={styles.priceSelector}>
                                                <TouchableOpacity style={styles.priceBtn}
                                                    onPress={() => this.onSubtractQuantity(item)}>
                                                    <Text style={styles.priceBtnText}>-</Text>
                                                </TouchableOpacity>
                                                <View style={styles.priceBtn}>
                                                    <Text style={[styles.priceBtnText, { fontSize: 16 }]}>{quantity}</Text>
                                                </View>
                                                <TouchableOpacity style={styles.priceBtn}
                                                    onPress={() => this.onPlusQuantity(item)}>
                                                    <Text style={styles.priceBtnText}>+</Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </View>
                        )
                    }}
                    renderHiddenItem={(data, rowMap) => (
                        <View style={styles.rowBack}>
                            {data.item.item_name && (
                                <TouchableOpacity
                                    style={styles.editBtn}
                                    onPress={() => {
                                        rowMap[data.item.key].closeRow();
                                        this.onEdit(data);
                                    }}>
                                    <Icon
                                        name='edit'
                                        type='material'
                                        size={35}
                                        color="#ffffff"
                                    />
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                style={styles.trashBtn}
                                onPress={() => {
                                    if (data.item.item_name) {
                                        rowMap[data.item.key].closeRow();
                                        this.onTrash(data.item.key);
                                    } else {
                                        this.context.setCartQuantity(this.context.cartQuantity - 1);
                                    }
                                }}>
                                <Image
                                    source={Images.icon_trash_white}
                                    style={styles.trashIcon}
                                />
                            </TouchableOpacity>
                        </View>
                    )}
                    rightOpenValue={-120}
                />
            </View>
        )
    }

    onEdit(data) {
        this.props.navigation.navigate('CustomizeItem', {
            item: data.item,
            key: data.item.key,
            quantity: data.item.quantity,
            menuItems: this.state.menuItems,
        });
    }

    onTrash(key) {
        const { menuItems } = this.state;
        const index = menuItems.findIndex((item) => item.key == key);
        if (index >= 0) {
            menuItems[index].quantity = 0;
        }
        this.setState({ menuItems });
    }

    onPlusQuantity(item) {
        const { menuItems, usedPromos } = this.state
        const relevantUsedPromo = item.promo_id ? usedPromos.filter(up => up.hasOwnProperty(item.promo_id)) : []

        const index = menuItems.findIndex((menu) => menu.key == item.key);
        let maxUses = !item.max_uses ? 9999 : relevantUsedPromo.length > 0 ? item.max_uses - relevantUsedPromo[0][item.promo_id].use_count : item.max_uses;
        if (index >= 0 && menuItems[index].quantity < maxUses) {
            menuItems[index].quantity++;
            this.setState({ menuItems });
            let oldCartSize = this.context.cartQuantity
            let newCartSize = this.context.cartQuantity + 1
            this.context.setCartQuantity(newCartSize);
            if (oldCartSize == 0 && newCartSize == 1) {
                this.context.setCartHasItem(true);
            }
            if (item.item_type == 'promotions') {
                cartContext.setCartHasPromo(true);
                updatePromotionQuantities(item.promo_id, 1, customerId, true)
            }
            this.context.setCartItems(menuItems);

            let newTime = 600
            this.context.setTime(newTime)
        }
    }

    onSubtractQuantity(item) {
        const { menuItems } = this.state;
        const index = menuItems.findIndex((menu) => menu.key == item.key);
        if (index >= 0) {
            if (menuItems[index].quantity >= 1) {
                menuItems[index].quantity--;
                this.setState({ menuItems });
                let newCartSize = this.context.cartQuantity - 1
                this.context.setCartQuantity(newCartSize);
                if (newCartSize == 0) {
                    this.context.setCartHasItem(false);
                }
                if (item.item_type == 'promotions') {
                    updatePromotionQuantities(item.promo_id, 1, customerId, false)
                }
            }
            this.context.setCartItems(menuItems);
            this.setState({ menuItems: menuItems })
        }
    }

    ////////////////////////////////////////////////////////////////////////////
    ////////////////////////////// Total //////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////
    _renderTotal() {
        const { restaurant, menuItems, promoCode, promoCodeError, discount, appliedCredit } = this.state;

        let subtotal = 0;
        let delivery = 0;

        for (const item of menuItems) {
            let price = item.item_price == "NaN" ? 0 : item.item_price
            subtotal += parseFloat(price) * item.quantity;
        }

        let total = subtotal + delivery - parseFloat(discount) - appliedCredit
        this.state.total = total

        return (
            <View style={styles.totalWrapper}>
                <View style={Styles.rowCenterBetween}>
                    <Text style={styles.promoText}>
                        Promo Code:
                    </Text>
                    <RoundTextInput
                        style={{ width: '50%' }}
                        type="text"
                        textAlign={'right'}
                        value={promoCode}
                        errorMessage={promoCodeError}
                        returnKeyType="next"
                        onChangeText={text =>
                            this.setState({ promoCode: text, promoCodeError: '' })
                        }

                    />
                    <TouchableOpacity
                        rounded={true}
                        enabled={promoCode != "" ? true : false}
                        style={{ backgroundColor: '#6D64F8', borderRadius: 10, padding: 10 }}
                        onPress={this.onSubmit}
                    >
                        <Text style={{ color: 'white', fontSize: 14 }}>
                            Submit
                        </Text>
                    </TouchableOpacity>
                </View>
                {this.state.credit > 0 && (
                    <View style={[Styles.rowCenterBetween, { paddingTop: 5 }]}>
                        <Text style={styles.promoText}>
                            Credit available:
                        </Text>
                        <Text style={styles.promoText}>
                            ${this.state.credit.toFixed(2)}
                        </Text>
                        <TouchableOpacity
                            rounded={true}
                            enabled={promoCode != "" ? true : false}
                            style={{ backgroundColor: '#fb322d', borderRadius: 10, padding: 10 }}
                            onPress={this.onUseCredit}
                        >
                            <Text style={{ color: 'white', fontSize: 14 }}>
                                Use Credit
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
                <View style={styles.subTotalWrapper}>
                    <View style={Styles.rowCenterBetween}>
                        <Text style={styles.totalTitleText}>Subtotal</Text>
                        <Text style={styles.totalTitleText}>${subtotal.toFixed(2)}</Text>
                    </View>
                    <View style={[Styles.rowCenterBetween, Styles.mt1]}>
                        <Text style={styles.deliveryTitleText}>Delivery</Text>
                        <Text style={styles.deliveryText}>Free</Text>
                    </View>
                    {this.state.discount > 0 &&
                        <View style={[Styles.rowCenterBetween, Styles.mt1]}>
                            <Text style={styles.deliveryTitleText}>Discount</Text>
                            <Text style={styles.discountText}>- {this.state.discount}</Text>
                        </View>
                    }
                    {this.state.applyCredit &&
                        <View style={[Styles.rowCenterBetween, Styles.mt1]}>
                            <Text style={styles.deliveryTitleText}>Credit</Text>
                            <Text style={styles.discountText}>- {this.state.appliedCredit?.toFixed(2)}</Text>
                        </View>
                    }
                </View>
                <View style={[Styles.rowCenterBetween, Styles.mt2]}>
                    <Text style={styles.totalTitleText}>Total</Text>
                    <Text style={styles.totalTitleText}>${total.toFixed(2)}</Text>
                </View>
            </View>
        )
    }

    ////////////////////////////////////////////////////////////////////////////
    ////////////////////////////// Footer //////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////
    _renderFooter() {
        let delivery = 0;
        let total = this.getSubTotal() + delivery;
        return (
            <View style={styles.footerWrapper}>
                <RoundButton
                    theme={'main'}
                    enabled={total > 0 ? true : false}
                    title={'CHECKOUT'}
                    style={{ backgroundColor: '#fb322d', borderRadius: 5, }}
                    onPress={this.onCheckOut}
                />
            </View>
        )
    }

    _checkPromoCode = async () => {
        let body = {
            'promoCode': this.state.promoCode,
        };
        try {
            const response = await fetch(
                'https://9yl3ar8isd.execute-api.us-west-1.amazonaws.com/beta/checkPromotionCode',
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

            let data = await response.json();
            return JSON.parse(data['body']);
        } catch (e) {
            console.error('error', e);
            return false;
        }
    };

    updatePromotionQuantities = async (id, purchased, customer_id, operation) => {
        let body = JSON.stringify({
            promo: {
                promo_id: id,
                total_purchased: purchased
            },
            incoming_id: customer_id,
            add: operation
        });
        let response;
        await fetch(
            'https://9yl3ar8isd.execute-api.us-west-1.amazonaws.com/beta/updatepromotionpurchases',
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
                body: body, // body data type must match “Content-Type” header
            },
        )
            .then(async res => {
                response = await res.json()
                console.log(response)
            })
            .catch(err => console.error('updatepromotionpurchases', err));
        return response;
    }

    // if discount applies to entire order, listOfMenuItems will be an empty list
    _changeTotal = (discountedItems, useCredit = false) => {
        const { menuItems, total, credit } = this.state;

        let discount = 0;

        if (useCredit) {
            let creditUsed = credit > (total - discount) ? (total - discount) : credit
            let newCredit = credit - creditUsed
            this.context.setAppliedCredit(creditUsed)
            this.setState({ applyCredit: true, appliedCredit: creditUsed, credit: newCredit })
        } else {
            if (discountedItems.length == 0) {
                for (const item of menuItems) {
                    discount += item.item_price * item.quantity * 0.1;
                }
            } else {
                for (const item of menuItems) {
                    let itemPrice = item.item_price
                    let discountedPrice = discountedItems.includes(item.item_name) ? itemPrice * 0.1 : 0
                    discount += discountedPrice * item.quantity;
                }
            }
        }

        let formatted_discount = discount.toFixed(2)
        this.context.setDiscount(formatted_discount)
        this.setState({ discount: formatted_discount })
    }

    // B1A4-C1FE
    // F4B1-E8F2
    onSubmit = async () => {
        const { menuItems, profile, restaurant, promoCode } = this.state;
        const promoExists = await this._checkPromoCode();
        let similarItems = []
        if (promoCode.length > 0) {
            let promoObj = promoExists.promo_obj
            if (promoExists.promo_code && promoObj.restaurant_id == restaurant.Profile.RestaurantId) {
                let menuItemNames = menuItems.filter(i => i.quantity > 0).map(i => i.item_name)
                let itemInCart = menuItemNames.includes(promoObj.title)

                if (itemInCart) {
                    let promoId = promoExists.promo_id
                    let promoOrderId = promoObj.order_id

                    // will return undefined or object {promo_id: {"use_count": Decimal("N")}}
                    let usedPromo = promoExists.uses.find(function (element) {
                        return typeof element[promoId] !== 'undefined';
                    });
                    let timesUsed = usedPromo ? usedPromo[promoId].use_count : 0

                    if (timesUsed < promoObj.max_uses) {
                        if (promoExists.customer_id == profile.CustomerId && promoExists.times_used < 1) {
                            this.setState({ promoCodeError: 'Promotional code must be used by another user first.' })
                        } else {
                            if (promoOrderId == 'entire_order') {
                                this._changeTotal([], false)
                            } else {
                                let menuItemNames = menuItems.map(item => item.item_name)
                                similarItems = promoOrderId.filter(e => menuItemNames.includes(e));

                                if (similarItems.length > 0) {
                                    this._changeTotal(similarItems, false)
                                } else {
                                    this.setState({ promoCodeError: 'This promo code does not apply to any items in your cart.' })
                                }
                            }
                        }
                    } else {
                        this.setState({ promoCodeError: 'You\'ve already used this promotion the maximun number of times!' })
                    }
                } else {
                    this.setState({ promoCodeError: 'Promo item \"' + promoObj.title + '\" is missing from your cart!' })
                }
            } else {
                this.setState({ promoCodeError: 'Invalid Promo Code' })
            }
        }
    }

    onUseCredit = async () => {
        const { credit } = this.state;
        if (credit > 0) {
            this._changeTotal([], true)
        }
    }

    onCheckOut = async () => {
        this.RBAddPaymentSheet.open();
    }

    getSubTotal() {
        const { menuItems } = this.state;
        let subtotal = 0;
        for (const item of menuItems) {
            if (item.item_price != "NaN") {
                subtotal += (parseFloat(item.item_price) * item.quantity);
            }
        }
        return parseFloat(subtotal.toFixed(2));
    }

    /////////////////////////////////////////////////////////////////
    /////////////////////// Add Payment Bottom Sheet ///////////////
    /////////////////////////////////////////////////////////////////
    _renderPaymentForm() {
        const { cardError, cardForm, selectedIndex, profile } = this.state;
        return (
            <View style={styles.paymentWrapper}>
                <View style={[styles.oneRowCenter, styles.cardTitleContainer]}>
                    <Text style={styles.sheetTitleText}>Payment method</Text>
                    <TouchableOpacity
                        style={styles.sheetCloseButton}
                        onPress={() => this.RBAddPaymentSheet.close()}>
                        <Image
                            style={styles.sheetCloseImage}
                            source={Images.icon_close}
                        />
                    </TouchableOpacity>
                </View>
                <View style={styles.cardContainer}>
                    <View style={{ ...styles.cardCover, paddingTop: selectedIndex == 1 ? 55 : 100 }}>
                        <CheckBox
                            title={profile.paymentOptions.default.cardNumber ? '**** **** **** *' + profile.paymentOptions.default.cardNumber.slice(-3) : 'No Saved Card'}
                            checkedIcon='dot-circle-o'
                            uncheckedIcon='circle-o'
                            checked={selectedIndex == 0}
                            onPress={() => this.setState({ selectedIndex: 0 })}
                        />
                        <CheckBox
                            title='Use Different Card'
                            checkedIcon='dot-circle-o'
                            uncheckedIcon='circle-o'
                            checked={selectedIndex == 1}
                            onPress={() => this.setState({ selectedIndex: 1 })}
                        />
                    </View>
                    <View style={{ top: selectedIndex == 1 ? -125 : -200 }}>
                        <CreditCardInput
                            cardImageBack={Images.image_blank}
                            cardImageFront={Images.image_blank}
                            labels={{ number: 'CARD NUMBER', expiry: 'EXPIRY', cvc: 'CVV/CVC' }}
                            onChange={this._onPaymentChange}
                        />
                        {cardError && cardError.length > 0 ? (
                            <Text style={styles.errorText}>{cardError}</Text>
                        ) : null}
                    </View>
                </View>
                <RoundButton
                    style={styles.sheetButton}
                    title={'CONFIRM'}
                    theme={'main'}
                    enabled={true}
                    onPress={this.onSave}
                />
            </View>
        );
    }

    _onPaymentChange = form => {
        this.setState({ cardForm: form, cardError: null });
    };

    onSave = () => {
        const { selectedIndex, cardForm, isLoading } = this.state;
        const { menuItems, profile, restaurant, promoCode } = this.state;

        Keyboard.dismiss();
        if (isLoading) {
            return;
        }

        var isValid = true;

        if ((selectedIndex == 0 && !profile.paymentOptions.default?.cardNumber)
            || (selectedIndex == 1 && (!cardForm || !cardForm.valid))) {
            this.setState({ cardError: 'Please input valid card information.', selectedIndex: 1 });
            isValid = false;
        }

        if (isValid) {
            this.RBAddPaymentSheet.close();
            setTimeout(() => {
                this.setState({ isLoading: true }, () => {
                    Stripe.setOptions({ publishableKey: config.pk_test });
                    Stripe.createTokenWithCard({
                        number: selectedIndex == 0 ? profile.paymentOptions.default.cardNumber : cardForm.values.number,
                        cvc: selectedIndex == 0 ? profile.paymentOptions.default.cvv : cardForm.values.cvc,
                        expMonth: selectedIndex == 0 ? parseInt(profile.paymentOptions.default.expirationMonth) : parseInt(cardForm.values.expiry.split('/')[0]),
                        expYear: selectedIndex == 0 ? parseInt(profile.paymentOptions.default.expirationYear) : parseInt(cardForm.values.expiry.split('/')[1]),
                        name: selectedIndex == 0 ? profile.paymentOptions.default.nameOnCard : 'order',
                    }).then(async tokeninfo => {
                        let cardInfo = selectedIndex == 0 ? profile.paymentOptions.default : {
                            cardNumber: cardForm.values.number,
                            cardType: cardForm.values.type,
                            cvv: cardForm.values.cvc, // ? cvv
                            expirationMonth: parseInt(cardForm.values.expiry.split('/')[0]),
                            expirationYear: parseInt(cardForm.values.expiry.split('/')[1]),
                            nameOnCard: 'order',
                        };

                        let isExisting = false;
                        for (let card of profile.paymentOptions.cards) {
                            if (card.cardNumber == cardInfo.cardNumber) {
                                isExisting = true; break;
                            }
                        }
                        let cards = isExisting ? profile.paymentOptions.cards : [cardInfo, ...profile.paymentOptions.cards];

                        let profileUpdatedCard = {
                            ...profile,
                            paymentOptions: {
                                cards: cards,
                                default: profile.paymentOptions.default.cardNumber == "" ? cardInfo : profile.paymentOptions.default,
                            }
                        }
                        updateDynamoCustomer(profileUpdatedCard);
                        if (selectedIndex == 0) {
                            await AsyncStorage.setItem("@CARD", JSON.stringify(cardInfo));
                        }
                        this.setState({ isLoading: false });
                        this.props.navigation.navigate('Checkout', { items: menuItems, promoCode: promoCode, restaurant, profileUpdatedCard, payment: tokeninfo });
                    }).catch((err) => {
                        this.setState({ isLoading: false });
                        this.toast.show(err.message, 2000);
                    });
                });
            }, 300);
        }
    }

    ////////////////////////////////////////////////////////////////////////////
    ////////////////////////////// Render //////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////
    render() {
        const { isLoading, restaurant, menuItems } = this.state;

        return (
            <View style={{ flex: 1, }}>
                {/* <Timer val={staticTime}></Timer> */}
                <SafeAreaInsetsContext.Consumer>
                    {insets => (
                        <View style={{ flex: 1 }}>
                            <View style={styles.container}>
                                {restaurant &&
                                    <>
                                        {this._renderMenus()}
                                        {this._renderTotal()}
                                        {this._renderFooter()}
                                    </>
                                }
                            </View>
                        </View>
                    )}
                </SafeAreaInsetsContext.Consumer>
                <RBSheet
                    ref={ref => {
                        this.RBAddPaymentSheet = ref;
                    }}
                    height={350}//{470}
                    duration={300}
                    customStyles={{
                        container: {
                            alignItems: 'center',
                            borderTopLeftRadius: 24,
                            borderTopRightRadius: 24,
                        },
                    }}>
                    {this._renderPaymentForm()}
                </RBSheet>
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
    restaurantWrapper: {
        margin: 15,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderColor: '#E2E2E2',
        flexDirection: 'row',
        alignItems: 'center',
    },
    restaurantImage: {
        width: 80,
        height: 80,
        borderRadius: 10,
    },
    restaurantInfo: {
        marginLeft: 15,
    },
    restaurantNameText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'black'
    },
    restaurantTypeText: {
        fontSize: 14,
        color: '#7D849A',
    },
    detailImage: {
        width: 15,
        height: 15,
        marginRight: 5,
        resizeMode: 'contain'
    },
    listContainer: {
        flex: 1,
        marginHorizontal: 15,
    },
    menuWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 5,
        backgroundColor: 'white',
        marginBottom: 10,
        height: 80
    },
    menuImage: {
        width: 80,
        height: 80,
        resizeMode: 'cover',
        borderRadius: 5
    },
    menuInfo: {
        marginLeft: 15
    },
    menuTitleText: {
        color: 'black',
        fontSize: 16
    },
    menuPriceText: {
        fontSize: 14,
        color: '#7D849A',
    },
    rowBack: {
        width: '100%',
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'flex-end'
    },
    priceWrapper: {
        marginTop: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: sWidth - 140
    },
    priceSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        borderRadius: 25,
        paddingHorizontal: 10,
    },
    priceBtn: {
        width: 30,
        height: 30,
        alignItems: 'center',
        justifyContent: 'center'
    },
    priceBtnText: {
        color: '#7D849A',
        fontSize: 20
    },
    editBtn: {
        backgroundColor: '#4bad38',
        width: 60,
        height: 80,
        alignItems: 'center',
        justifyContent: 'center',
        borderRightWidth: 0.5,
        borderColor: 'white'
    },
    trashBtn: {
        backgroundColor: '#f66b00',
        width: 60,
        height: 80,
        alignItems: 'center',
        justifyContent: 'center',
        borderTopRightRadius: 5,
        borderBottomRightRadius: 5
    },
    trashIcon: {
        width: 30,
        height: 30,
        resizeMode: 'contain',
    },
    totalWrapper: {
        paddingTop: 10,
        marginHorizontal: 15,
        paddingBottom: 30
    },
    promoText: {
        color: 'black',
        fontSize: 14
    },
    promoText2: {
        color: 'black',
        fontSize: 14,
        paddingLeft: 5
    },
    subTotalWrapper: {
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderColor: '#E2E2E2',
        marginTop: 20
    },
    totalTitleText: {
        color: 'black',
        fontSize: 15,
        fontWeight: 'bold'
    },
    deliveryTitleText: {
        color: '#7D849A'
    },
    deliveryText: {
        color: '#00824B',
        fontSize: 14
    },
    discountText: {
        color: '#6D64F8',
        fontSize: 15
    },
    footerWrapper: {
        backgroundColor: 'white',
        padding: 10,
        borderBottomWidth: 1,
        borderColor: '#E2E2E2',
    },
    paymentWrapper: {
        flex: 1,
        width: '100%',
        backgroundColor: 'white',
        alignItems: 'center',
        paddingVertical: 20,
    },
    cardTitleContainer: {
        width: '100%',
        height: 50,
        top: 0,
        zIndex: 3,
    },
    oneRowCenter: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    cardContainer: {
        width: '100%',
        height: 170, //320,
    },
    cardMainContainer: {
        top: -125
    },
    cardCover: {
        top: -70,
        position: 'absolute',
        width: '100%',
        backgroundColor: 'white',
        zIndex: 2,
        justifyContent: 'center',
        paddingTop: 55,
        paddingHorizontal: 20,
    },

    sheetTitleText: {
        fontSize: 19,
        marginBottom: 15,
        textAlign: 'center',
        width: '100%'
    },

    sheetCloseButton: {
        position: 'absolute',
        right: 15,
        top: 2,
    },

    sheetCloseImage: {
        width: 22,
        height: 22,
    },

    sheetButton: {
        width: sWidth - 40,
        backgroundColor: '#fb322d',
        borderRadius: 5,
        marginTop: 20,
    },

    errorText: {
        fontStyle: 'italic',
        color: '#cf0000',
        fontSize: 11,
        marginTop: -30,
        textAlign: 'center',
    },
    timerHeader: {
        paddingTop: 5,
        paddingBottom: 5,
        backgroundColor: '#6D64F8',
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center'
    },
    timerText: {
        color: 'white',
        fontSize: 14,
        paddingLeft: 10,
        flex: 5,
    },
    timerTimerText: {
        fontSize: 18,
        color: 'white',
        flex: 1,
    }
});