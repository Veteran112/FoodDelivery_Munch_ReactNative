import React from 'react';
import { Text } from 'react-native';
import Orders from './components/Orders';
import Profile from './components/Profile';
import RestaurantList from './components/RestaurantList';
import Promotion from './components/Promotions';
import TabBar from './tabbar';
import CheckoutContext, { useCheckout } from './context/CheckoutContext';

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

const Tab = createBottomTabNavigator();
var data;
var restaurants = [];
var promos;
var credit;
export default class Customer extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      name: props.name,
      data: props.data,
      restaurants: props.restaurants,
      restaurantConfigs: props.restaurantConfigs,
      promos: props.promos,
      usedPromos: [],
      credit: props.credit
    };
    data = this.state.data;
    restaurants = this.state.restaurants;
    restaurantConfigs = this.state.restaurantConfigs;
    promos = this.state.promos;
    usedPromos = data.UsedPromoList
    credit = this.state.credit
  }

  render() {
    return (
      <CheckoutContext>
        <NavigationBar />
      </CheckoutContext>
    )
  }
}

//TODO: Add icons to the nav bar
function NavigationBar() {
  useCheckout().setAvailableCredit(credit)

  return (
    <Tab.Navigator tabBar={props => <TabBar {...props} />}>
      <Tab.Screen
        name="Home"
        component={RestaurantList}
        initialParams={{ restaurants, restaurantConfigs, data, promos, usedPromos }}
      />
      <Tab.Screen
        name="Promotion"
        component={Promotion}
        initialParams={{ restaurants, data, promos }}
      />
      <Tab.Screen name="Orders" component={Orders} />
      <Tab.Screen
        name="Profile"
        component={Profile}
        initialParams={{ data: data }}
      />
    </Tab.Navigator>
  );
}
