import React, { useState, useContext } from 'react';
import { textContext } from "../context/TextContext";
import { createStackNavigator } from '@react-navigation/stack';
import RestaurantDisplay from './subcomponents/RestaurantDisplay';
import AddItemToCart from './subcomponents/AddItemToCart';
import MenuDisplay from './subcomponents/MenuDisplay';
import OrderReview from './subcomponents/OrderReview';
import AddressSelect from './subcomponents/AddressSelect';
import Cart from './subcomponents/Cart/Cart';
import { Image, Icon, Button, Text } from 'react-native-elements';
import { Auth } from 'aws-amplify';
import { View, Alert } from 'react-native';
import SearchBar from "react-native-dynamic-search-bar";
import MyOrdersScreen from "./subcomponents/MyOrdersScreen";
import CheckoutScreen from "./subcomponents/CheckoutScreen";
import CustomizeItem from './subcomponents/CustomizeItem';
import { checkoutContext } from '../context/CheckoutContext';

import Images from "../../theme/Images";

const OrderStack = createStackNavigator();
const Stack = createStackNavigator();

export default class RestaurantList extends React.Component {
  static contextType = checkoutContext;
  constructor(props) {
    super(props);
    this.state = {
      signedIn: false,
      address: 'g',
      name: '',
      restaurantList: props.route.params.restaurants,
      restaurantConfigs: props.route.params.restaurantConfigs,
      profile: props.route.params.data,
      promos: props.route.params.promos,
      usedPromos: props.route.params.usedPromos
    };
  }

  componentDidMount() {
    Auth.currentUserInfo().then(info => {
      let profile = this.state.profile;
      profile.customerInfo.contactInformation.emailAddress =
        info.attributes.email;
      profile.customerInfo.contactInformation.contactNumber.phoneNumber =
        info.attributes.phone_number;
      this.setState({
        profile,
      });
    });
    this.context.setUsedPromos(this.state.usedPromos)
  }

  render() {
    return (
      <Stack.Navigator
        initialRouteName="OrderStack"
        mode="modal"
        headerMode="none">
        <Stack.Screen
          name="Order Stack"
          component={OrderStackStructure}
          initialParams={{
            restaurantList: this.state.restaurantList,
            restaurantConfigs: this.state.restaurantConfigs,
            profile: this.state.profile,
            promos: this.state.promos,
          }}
          options={({ navigation, route }) => ({
            title:
              'Deliver To ' +
              route.params.profile.customerInfo.address?.address,
          })}
        />
        <Stack.Screen
          name="Address Select"
          component={AddressSelect}
          options={({ navigation, route }) => ({
            title: '',
            presentation: 'modal',
          })}
        />
      </Stack.Navigator>
    );
  }
}

const RestSearchBar = () => {
  const { textUpdate } = useContext(textContext)
  return (
    <SearchBar
      placeholder="Search here"
      onChangeText={(text) => textUpdate(text)}
      style={{ width: '85%' }}
    />
  )
}

const OrderStackStructure = ({ navigation, route }) => {
  const [textVal, updateText] = useState("")
  const cartCont = useContext(checkoutContext)

  function textUpdate(text) {
    updateText(text)
  }
  return (
    <textContext.Provider value={{ textVal, textUpdate }}>
      <OrderStack.Navigator initialRouteName="RestaurantDisplay">
        <OrderStack.Screen
          name="RestaurantDisplay"
          component={RestaurantDisplay}
          initialParams={{
            restaurantList: route.params.restaurantList,
            profile: route.params.profile,
            promos: route.params.promos,
            usedPromos: route.params.usedPromos
          }}
          options={() => ({
            headerStyle: { height: 120 },
            headerTitle: (props) => {
              return (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20, }}>
                  <Image source={Images.logo_square_red} style={{ resizeMode: "stretch", width: 30, height: 30, marginRight: 15 }} />
                  <RestSearchBar />
                </View>
              );
            }
          })}
        />
        <OrderStack.Screen
          name="MyOrders"
          component={MyOrdersScreen}
          options={() => ({
            title: 'Menu',
            headerTitleStyle: {
              color: 'black',
            },
            headerTintColor: '#E82800',
            headerLeft: props => (
              <Button
                icon={
                  <Icon
                    name="chevron-thin-left"
                    type="entypo"
                    size={15}
                    color="#E82800"
                  />
                }
                title="Back"
                titleStyle={{ color: '#E82800' }}
                type="clear"
                onPress={() => {
                  if (cartCont.cartQuantity > 0) {
                    Alert.alert(
                      'Unsaved Changes',
                      'Are you sure you want to cancel your order with this restaurant?',
                      [
                        {
                          text: 'Ok',
                          onPress: () => {
                            let items = cartCont.cartItems.map((item) => {
                              return { ...item, quantity: 0 }
                            })
                            cartCont.setCartItems(items)
                            cartCont.setCartHasPromo(false)
                            cartCont.setCartHasItem(false)
                            cartCont.setCartQuantity(0)
                            cartCont.setTime(0)

                            navigation.navigate('RestaurantDisplay', {
                              restaurantList: route.params.restaurantList,
                              profile: route.params.profile,
                              promos: route.params.promos,
                              usedPromos: route.params.usedPromos
                            });
                          },
                        },
                        { text: 'Cancel' },
                      ],
                    );
                  } else {
                    navigation.navigate('RestaurantDisplay', {
                      restaurantList: route.params.restaurantList,
                      profile: route.params.profile,
                      promos: route.params.promos,
                      usedPromos: route.params.usedPromos
                    });
                  }
                }}
              />
            ),
          })}
          initialParams={{
            promos: route.params.promos,
            usedPromos: route.params.usedPromos,
            restaurantConfigs: route.params.restaurantConfigs
          }}

        />
        <OrderStack.Screen
          name="Cart"
          component={Cart}
          options={() => ({
            title: 'Cart',
            headerTitleStyle: {
              color: 'black',
            },
            headerTintColor: '#E82800',
            headerLeft: props => (
              <Button
                icon={
                  <Icon
                    name="chevron-thin-left"
                    type="entypo"
                    size={15}
                    color="#E82800"
                  />
                }
                title="Back"
                titleStyle={{ color: '#E82800' }}
                type="clear"
                onPress={() => {
                  navigation.navigate('RestaurantDisplay', {
                    restaurantList: route.params.restaurantList,
                    profile: route.params.profile,
                    promos: route.params.promos,
                    usedPromos: route.params.usedPromos
                  });
                }
                }
              />
            ),
          })}
          initialParams={{
            profile: route.params.profile,
            usedPromos: route.params.usedPromos,
            customerId: route.params.profile.CustomerId,
          }}
        />
        <OrderStack.Screen
          name="CustomizeItem"
          component={CustomizeItem}
          options={() => ({
            title: 'Customize',
            headerBackTitle: '',
            headerTitleStyle: {
              color: 'black',
            },
            headerTintColor: '#E82800',
          })}
          initialParams={{
            usedPromos: route.params.usedPromos,
            customerId: route.params.profile.CustomerId,
          }}
        />
        <OrderStack.Screen
          name="Checkout"
          component={CheckoutScreen}
          initialParams={{
            profile: route.params.profile,
            usedPromos: route.params.usedPromos,
          }}
          options={({ navigation, route }) => ({
            title: 'Checkout',
            headerBackTitle: '',
            headerTitleStyle: {
              color: 'black',
            },
            headerTintColor: '#E82800',
          })}
        />
        <OrderStack.Screen
          name="MenuDisplay"
          component={MenuDisplay}
          options={() => ({
            title: 'Choose an Item',
            headerBackTitle: '',
          })}
        />
        <OrderStack.Screen
          name="Order Review"
          component={OrderReview}
          initialParams={{
            profile: route.params.profile,
          }}
          options={({ navigation, route }) => ({
            title: 'Checkout',
            profile: route.params.profile,
            headerBackTitle: '',
            headerTitleStyle: {
              color: 'black',
            },
            headerTintColor: '#E82800',
          })}
        />
        <OrderStack.Screen
          name="AddItemToCart"
          component={AddItemToCart}
          options={() => ({
            title: 'Customize',
            headerBackTitle: 'Cancel',
            headerTitleStyle: {
              color: 'black',
            },
            headerTintColor: '#E82800',
          })}
        />
      </OrderStack.Navigator>
    </textContext.Provider>
  );
};
