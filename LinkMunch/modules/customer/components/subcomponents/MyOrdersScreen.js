import React, { Component, useContext } from 'react';
import { View, StyleSheet, Keyboard, Text, Image, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import Toast from 'react-native-easy-toast';
import FastImage from 'react-native-fast-image';
import { SwipeListView } from 'react-native-swipe-list-view';
import { CreditCardInput } from 'react-native-input-credit-card';
import RBSheet from 'react-native-raw-bottom-sheet';
import { checkoutContext } from '../../context/CheckoutContext';
import Styles from '../../../theme/Styles';
import Images from '../../../theme/Images';
import RoundTextInput from './RoundTextInput';
import RoundButton from './RoundButton';
import Stripe from 'tipsi-stripe';
import config from '../../config';
import Loading from 'react-native-loading-spinner-overlay';
import CartButton from './Cart/CartButton';
import Timer from "./Timer/Timer";


const sWidth = Dimensions.get('window').width;

export default class MyOrdersScreen extends Component {
    static contextType = checkoutContext;
    constructor(props) {
        super();
        let r_id = props.route.params.restaurant.RestaurantId;
        let r_props_restaurantConfig = props.route.params.restaurantConfigs
        let r_restaurantConfig = r_props_restaurantConfig ? r_props_restaurantConfig.filter(config => config.menu_id == r_id) : []
        let r_menuCategories = r_restaurantConfig.length < 1 ? [] : r_restaurantConfig[0].menu_config.categories

        this.state = {
            isLoading: false,
            restaurant: props.route.params.restaurant,
            restaurantConfigs: r_props_restaurantConfig,
            profile: props.route.params.profile,
            menuItems: props.route.params.menuItems,
            menuCategories: r_menuCategories,
            promos: props.route.params.promos,
            promoCode: '',
            promoCodeError: '',
            restaurantMenu: {},
            cardForm: null,
            cardError: null,
            isShowSelectPaymentModal: false,
            currentTab: 'promotions',
            usedPromos: props.route.params.usedPromos
        };
    }

    componentDidMount() {
        if (this.context.restaurant != this.state.restaurant.Profile.restaurantInfo.restaurantName) {
            this.context.setRestaurant(this.state.restaurant.Profile.restaurantInfo.restaurantName);
            this.context.setRestaurantInfo(this.state.restaurant);
            this.context.setCartItems([]);
            this.context.setCartQuantity(0);
            this.context.setCartHasItem(false);
            this.context.setDiscount(0)
        }
        this.focusListener = this.props.navigation.addListener(
            'focus',
            this.willFocusPage,
        );
        if (this.state.menuItems.length == 0) {
            this.getRestaurantMenu();
        }
    }

    componentDidUpdate(prevProps, prevState) {
        console.log('Checkout quantity?', this.context.cartQuantity);
        console.log('Checkout has item?', this.context.cartHasItem);
        console.log('Checkout cart items', this.context.cartItems);
        console.log('Cart Restaurant', this.context.restaurant);
        console.log('Restaurant Info', this.context.restaurantInfo);
        this.context.setTime(this.context.timer)
    }

    componentWillUnmount() {
        this.focusListener();
    }

    willFocusPage = () => { }

    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    async getRestaurantMenu() {
        let body = JSON.stringify({
            restaurant_id: this.state.restaurant.RestaurantId
        });
        let response;
        await fetch(
            'https://9yl3ar8isd.execute-api.us-west-1.amazonaws.com/beta/getRestaurant',
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
                this.setState({ restaurantMenu: response.restaurantMenu, menuItems: JSON.parse(response.restaurantMenu.menu_items) })
            })
            .then(() => this._createMenuItems())
            .catch(err => console.error('getrestauranterr', err));
        return response;
    }

    _createMenuItems() {
        const { restaurant, menuItems, profile, restaurantMenu, usedPromos } = this.state;
        if (this.props.route && this.props.route.params) {
            let items = [];
            let now = Date.now()

            // move this earlier? doesn't seem to effect performacne a ton, but there's still a "blip"
            let usedPromoIds = usedPromos == undefined || usedPromos.length == 0 ? [] : usedPromos.map(up => this.state.promos.filter(p => up.hasOwnProperty(p.promo_id)).map(i => ({ 'id': i.promo_id, 'max_uses': i.max_uses, 'used': up[i.promo_id].use_count })).flat()).flat()
            let promoItems = this.state.promos.filter(p => {
                let correctRestaurant = p.restaurant_id === this.state.restaurant.Profile.RestaurantId
                if (correctRestaurant) {
                    return !usedPromoIds.map(up => p.promo_id == up.id && up.used >= up.max_uses).includes(true)
                } else {
                    return false
                }
            })

            let newMenuItems = promoItems.map(pi => {
                let promoMaxUses = Math.floor(pi.budget / (pi.discount * 0.3)) - pi.total_purchased
                
                return {
                    'available': now > pi.start_time && now < pi.end_time,
                    'item_description': pi.description,
                    'item_ingredients': [],
                    'item_name': pi.title,
                    'item_price': (parseFloat(pi.discount)*1.1).toFixed(2),
                    'item_type': "promotions",
                    'unavailable': now < Date.parse(pi.start_time.slice(0, -1)) || now > Date.parse(pi.end_time.slice(0, -1)),
                    'max_uses': Math.min(pi.max_uses, promoMaxUses),
                    'promo_id': pi.promo_id,
                    'picture': pi.content_id
                }
            }
            )
            items = menuItems.concat(newMenuItems).filter(i => i.available);           

            for (let i = 0; i < items.length; i++) {
                items[i] = {
                    ...items[i],
                    key: i,
                    quantity: 0,
                    instructions: '',
                }
            }
            this.setState({ restaurant, profile, menuItems: this.context.cartItems.length == 0 ? items : this.context.cartItems });
        }
    }

    ////////////////////////////////////////////////////////////////////////////
    ////////////////////////////// Restaurant //////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////
    _renderRestaurant() {
        const { restaurant } = this.state;
        const image = restaurant && restaurant.Profile.picture ? { uri: restaurant.Profile.picture } : Images.icon_restaurant_placeholder;
        const name = restaurant ? restaurant.Profile.restaurantInfo.restaurantName : '';
        let type = '';
        const address = restaurant ? restaurant.Profile.restaurantInfo.restaurantAddress.address : '';
        const phoneNumber = restaurant ? restaurant.Profile.restaurantInfo.restaurantPhoneNumber : '';
        const email = restaurant ? restaurant.Profile.restaurantInfo.restaurantEmail.toLowerCase() : '';
        const reviewRate = '5.0';
        if (restaurant && restaurant.Profile.restaurantInfo.restaurantType) {
            for (let i = 0; i < restaurant.Profile.restaurantInfo.restaurantType.typeTags.length; i++) {
                if (i == restaurant.Profile.restaurantInfo.restaurantType.typeTags.length - 1) {
                    type += this.capitalize(restaurant.Profile.restaurantInfo.restaurantType.typeTags[i]);
                } else {
                    type += this.capitalize(restaurant.Profile.restaurantInfo.restaurantType.typeTags[i]) + ', ';
                }
            }
        }
        return (
            <View style={styles.restaurantWrapper}>
                <FastImage style={styles.restaurantImage} source={image} />
                <View style={styles.restaurantInfo}>
                    <Text style={styles.restaurantNameText}>{name}</Text>
                    <Text style={[styles.restaurantTypeText, { marginVertical: 5 }]}>{type}</Text>
                    <View style={Styles.rowCenter}>
                        <View style={Styles.rowCenter}>
                            <Image style={styles.detailImage} source={Images.icon_star} />
                            <Text style={styles.restaurantTypeText}>{reviewRate}</Text>
                        </View>
                        {address ?
                            (<View style={Styles.rowCenter}>
                                <Text style={styles.restaurantTypeText}> - </Text>
                                <Image style={styles.detailImage} source={Images.icon_location} />
                                <Text style={styles.restaurantTypeText}>{address}</Text>
                            </View>) : null
                        }
                    </View>
                    <View style={Styles.rowCenter}>
                        <Image style={styles.detailImage} source={Images.icon_phone} />
                        <Text style={styles.restaurantTypeText}>{phoneNumber}</Text>
                    </View>
                    <View style={Styles.rowCenter}>
                        <Image style={styles.detailImage} source={Images.icon_mail} />
                        <Text style={styles.restaurantTypeText}>{email}</Text>
                    </View>
                </View>
            </View>
        )
    }

    ////////////////////////////////////////////////////////////////////////////
    ////////////////////////////// Menus //////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////
    _renderMenuTabs() {
        let relTabs = [... new Set(this.state.menuItems.map(i => i.item_type))]

        const { currentTab } = this.state;
        const defaultCategories = [
            {
                key: 'promotions',
                label: 'Promos',
                value: 'promotions'
            },
            {
                key: 'appetizer',
                label: 'Appetizers',
                value: 'appetizer'
            },
            {
                key: 'entree',
                label: 'Main',
                value: 'entree'
            },
            {
                key: 'dessert',
                label: 'Desserts',
                value: 'dessert'
            },
            {
                key: 'drink',
                label: 'Drinks',
                value: 'drink'
            },
            {
                key: 'other',
                label: 'Other',
                value: 'other'
            },
        ]
        const promoCategoryObj = {
            key: 'promotions',
            label: 'Promos',
            value: 'promotions'
        }

        let menuCategoriesUse = this.state.menuCategories ? this.state.menuCategories.filter(n => relTabs.includes(n.value)) : defaultCategories.filter(n => relTabs.includes(n.value))
        if (menuCategoriesUse.map(i => i.value).indexOf('promotions') == -1) {
            menuCategoriesUse.unshift(promoCategoryObj)
        }
        
        return (
            <View style={{ paddingBottom: 10, paddingLeft: 5, paddingRight: 5 }}>
                <ScrollView
                    horizontal={true}
                    showsHorizontalScrollIndicator={false}
                >
                    {menuCategoriesUse.map(category => {
                        return (
                            <TouchableOpacity key={menuCategoriesUse.indexOf(category)} onPress={() => this._setCurrentTab(category.value)} style={styles.tabTO}>
                                <View style={{ ...styles.tabItem, backgroundColor: currentTab == category.value ? '#E82800' : undefined }}>
                                    <Text style={{ ...styles.tabText, color: currentTab == category.value ? 'white' : 'black' }}>{category.label}</Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>
        )
    }

    _setCurrentTab(itemType) {
        this.setState({ currentTab: itemType })
    }

    _renderMenus() {
        const { menuItems, profile, restaurantMenu, currentTab } = this.state;

        return (
            <View style={{ flex: 1, flexGrow: 1, }}>
                <SwipeListView
                    style={styles.listContainer}
                    data={menuItems.filter((item) => item.item_type == currentTab)}
                    showsVerticalScrollIndicator={false}
                    keyExtractor={(item, index) => index + ''}
                    renderItem={({ item, index }) => {
                        const menuImage = item.picture ? { uri: item.picture } : Images.icon_food_placeholder;
                        const menuTitle = item.item_name || '';
                        const price = item.item_price || '0.0';
                        const quantity = item.quantity + '';
                        const data = {
                            item: item,
                        }
                        return (
                            <TouchableOpacity
                                onPress={() => this.onEdit(data)}
                                key={index}>
                                <View style={styles.menuWrapper}>
                                    {item.picture ? (
                                        <Image style={styles.menuImage} source={menuImage} />
                                    ) : null
                                    }
                                    <View style={styles.menuInfo}>
                                        <Text style={styles.menuTitleText}>{menuTitle}</Text>
                                        <View style={styles.priceWrapper}>
                                            <Text style={styles.menuPriceText}>${price}</Text>
                                        </View>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        )
                    }}
                />
            </View>
        )
    }

    onEdit(data) {
        this.props.navigation.navigate('CustomizeItem', {
            item: data.item,
            key: data.item.value,
            quantity: data.item.quantity,
            menuItems: this.state.menuItems,
            usedPromos: usedPromos
        });
    }

    onTrash(key) {
        const { menuItems } = this.state;
        const index = menuItems.findIndex((item) => item.value == key);
        if (index >= 0) {
            menuItems.splice(index, 1);
        }
        this.setState({ menuItems });
    }

    // onPlusQuantity(item) {
    //     const { menuItems } = this.state;
    //     const index = menuItems.findIndex((menu) => menu.value == item.value);
    //     if (index >= 0) {
    //         menuItems[index].quantity++;
    //         this.setState({ menuItems });
    //         let oldCartSize = this.context.cartQuantity
    //         let newCartSize = this.context.cartQuantity + 1
    //         this.context.setCartQuantity(newCartSize);
    //         if (oldCartSize == 0 && newCartSize == 1) {
    //             this.context.setCartHasItem(true);
    //         }
    //         this.context.setCartItems(menuItems);
    //     }
    // }

    // onSubtractQuantity(item) {
    //     const { menuItems } = this.state;
    //     const index = menuItems.findIndex((menu) => menu.value == item.value);
    //     if (index >= 0) {
    //         if (menuItems[index].quantity >= 1) {
    //             menuItems[index].quantity--;
    //             this.setState({ menuItems });
    //             let newCartSize = this.context.cartQuantity - 1
    //             this.context.setCartQuantity(newCartSize);
    //             if (newCartSize == 0) {
    //                 this.context.setCartHasItem(false);
    //             }
    //         }
    //         this.context.setCartItems(menuItems);
    //     }
    // }

    ////////////////////////////////////////////////////////////////////////////
    ////////////////////////////// Total //////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////
    _renderTotal() {
        const { restaurant, menuItems, promoCode, promoCodeError } = this.state;
        let subtotal = 0;
        let delivery = 0;
        let total = 0;
        for (const item of menuItems) {
            subtotal += item.item_price * item.quantity;
        }
        total = subtotal + delivery;
        return (
            <View style={styles.totalWrapper}>
                <View style={Styles.rowCenterBetween}>
                    <Text style={styles.promoText}>PromoCode</Text>
                    <RoundTextInput
                        style={{ width: 200 }}
                        type='text'
                        textAlign={'right'}
                        value={promoCode}
                        errorMessage={promoCodeError}
                        returnKeyType='next'
                        onChangeText={text => this.setState({ promoCode: text, promoCodeError: '' })}
                    />
                </View>
                <View style={styles.subTotalWrapper}>
                    <View style={Styles.rowCenterBetween}>
                        <Text style={styles.totalTitleText}>Subtotal</Text>
                        <Text style={styles.totalTitleText}>${subtotal.toFixed(2)}</Text>
                    </View>
                    <View style={[Styles.rowCenterBetween, Styles.mt1]}>
                        <Text style={styles.deliveryTitleText}>Delivery</Text>
                        <Text style={styles.deliveryText}>Free</Text>
                    </View>
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
            <CartButton navigation={this.props.navigation} />
        )
    }

    onCheckOut = () => {
        const { menuItems, profile, restaurant, promoCode } = this.state;
        this.RBAddPaymentSheet.open();
    }

    getSubTotal() {
        const { menuItems } = this.state;
        let subtotal = 0;
        for (const item of menuItems) {
            subtotal += item.item_price * item.quantity;
        }
        return parseFloat(subtotal.toFixed(2));
    }

    /////////////////////////////////////////////////////////////////
    /////////////////////// Add Payment Bottom Sheet ///////////////
    /////////////////////////////////////////////////////////////////
    _renderPaymentForm() {
        const { cardError } = this.state;

        return (
            <View style={styles.paymentWrapper}>
                <View style={[styles.oneRowCenter, { width: '100%', height: 50 }]}>
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
                    <CreditCardInput
                        labels={{ number: 'CARD NUMBER', expiry: 'EXPIRY', cvc: 'CVV/CVC' }}
                        onChange={this._onPaymentChange}
                    />
                    {cardError && cardError.length > 0 ? (
                        <Text style={styles.errorText}>{cardError}</Text>
                    ) : null}
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
        const { cardForm, isLoading } = this.state;
        const { menuItems, profile, restaurant, promoCode } = this.state;

        Keyboard.dismiss();
        if (isLoading) {
            return;
        }

        var isValid = true;
        if (!cardForm || !cardForm.valid) {
            this.setState({ cardError: 'Please input valid card information.' });
            isValid = false;
        }

        if (isValid) {
            this.RBAddPaymentSheet.close();
            setTimeout(() => {
                this.setState({ isLoading: true }, () => {
                    Stripe.setOptions({ publishableKey: config.pk_test });
                    Stripe.createTokenWithCard({
                        number: cardForm.values.number,
                        cvc: cardForm.values.cvc,
                        expMonth: parseInt(cardForm.values.expiry.split('/')[0]),
                        expYear: parseInt(cardForm.values.expiry.split('/')[1]),
                        name: 'order',
                    }).then(async tokeninfo => {
                        this.setState({ isLoading: false });
                        this.props.navigation.navigate('Checkout', { items: menuItems, promoCode: promoCode, restaurant, profile, payment: tokeninfo });
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
        const { isLoading, restaurant, profile } = this.state;
        console.log(profile)

        return (
            <View style={{ flex: 1, }}>
                <Timer initialParams={{
                    customerId: profile.CustomerId,
                }} initialValue={this.context.timer}></Timer>
                <SafeAreaInsetsContext.Consumer>
                    {insets => (
                        <View style={{ flex: 1 }}>
                            <View style={styles.container}>
                                {restaurant &&
                                    <>
                                        {this._renderRestaurant()}
                                        {this._renderMenuTabs()}
                                        {this._renderMenus()}
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
                    height={470}
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

async function updatePromotionQuantities(id, purchased, customer_id, operation) {
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

const styles = StyleSheet.create({
    tabContainer: {
        padding: 0,
        margin: 0,
        flex: 0,
        // height: 20
    },
    tabItem: {
        padding: 10,
        borderRadius: 20,
    },
    tabText: {
        fontWeight: '600',
    },
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
        marginHorizontal: 15
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
        backgroundColor: '#eaeaea',
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
        fontSize: 16
    },
    subTotalWrapper: {
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderColor: '#E2E2E2',
        marginTop: 20
    },
    totalTitleText: {
        color: 'black',
        fontSize: 20,
        fontWeight: 'bold'
    },
    deliveryTitleText: {
        color: '#7D849A'
    },
    deliveryText: {
        color: '#00824B',
        fontSize: 18
    },
    footerWrapper: {
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderColor: '#E2E2E2',
    },
    paymentWrapper: {
        flex: 1,
        width: '100%',
        backgroundColor: 'white',
        alignItems: 'center',
        paddingVertical: 20
    },

    oneRowCenter: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    cardContainer: {
        width: '100%',
        height: 320,
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
    },

    errorText: {
        fontStyle: 'italic',
        color: '#cf0000',
        fontSize: 11,
        marginTop: -30,
        textAlign: 'center',
    },
    tabIndicator: {
        backgroundColor: 'black',

    },
    tabTO: {
        padding: 0
    }
});