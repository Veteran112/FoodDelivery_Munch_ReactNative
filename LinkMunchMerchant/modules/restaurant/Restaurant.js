import React from 'react';
import Promotion from './components/Promotion';
import MenuUpdater from './components/MenuUpdater';
import Orders from './components/Orders';
import Profile from './components/Profile';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import TabBar from './tabbar'
import OrderContext from './context/OrderContext';

const Tab = createBottomTabNavigator();
var id;
var data;
var menu;
var menuCategories;
var orders;
var promos;
export default class Restaurant extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      name: props.name,
      protoUrl: '',
      data: props.data,
      orders: props.orders,
      menu: props.menu,
      menuCategories: props.menuCategories,
      promos: props.promos,
      id: props.id
    };
    id = this.state.id
    data = this.state.data;
    orders = this.state.orders;
    menu = this.state.menu;
    promos = this.state.promos;
    menuCategories = this.state.menuCategories
    nName = this.state.name
  }
  render() {
    return (
      <OrderContext>
        <NavigationBar />
      </OrderContext>
    );
  }
}
//TODO: Add icons to the nav bar
function NavigationBar() {
  return (
    <Tab.Navigator
      tabBar={(props) => <TabBar {...props} />}>
      <Tab.Screen
        name="Orders"
        component={Orders}
        initialParams={{
          id: id,
          data: orders,
        }}
      />
      <Tab.Screen
        name="Promotion"
        component={Promotion}
        initialParams={{
          id: id,
          name: nName,
          menu: menu,
          menuCategories: menuCategories,
          data: data,
          orders: orders,
          promos: promos,
        }}
      />
      <Tab.Screen
        name="Menu"
        component={MenuUpdater}
        initialParams={{
          id: id,
          data: menu,
          menuCategories: menuCategories
        }}
      />
      <Tab.Screen
        name="Profile"
        component={Profile}
        initialParams={{
          id: id,
          data: data
        }}
      />
    </Tab.Navigator>
  )
}
