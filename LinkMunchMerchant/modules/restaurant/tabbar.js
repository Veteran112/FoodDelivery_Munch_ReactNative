import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Image } from 'react-native';
import { RFValue } from 'react-native-responsive-fontsize';

const menu = require('../assets/tab-restaurant/menu.png');
const menu_outline = require('../assets/tab-restaurant/menu-outline.png');
const order = require('../assets/tab-restaurant/orders.png');
const order_outline = require('../assets/tab-restaurant/orders-outline.png');
const profile = require('../assets/tab-restaurant/profile.png');
const profile_outline = require('../assets/tab-restaurant/profile-outline.png');
const promotion = require('../assets/tab-restaurant/promotion.png');
const promotion_outline = require('../assets/tab-restaurant/promotion-outline.png');

export default function Tabbar({ state, navigation }) {
  const { routes, index } = state;

  const geticon = name => {
    switch (name) {
      case 'Menu':
        return { selected: menu, unselected: menu_outline };
      case 'Orders':
        return { selected: order, unselected: order_outline };
      case 'Profile':
        return { selected: profile, unselected: profile_outline };
      default:
        return { selected: promotion, unselected: promotion_outline };
    }
  };

  return (
    <View style={style.container}>
      {routes.map((item, indexitem) => {
        const icon = geticon(item.name);
        return (
          <TouchableOpacity
            style={{ flex: 1, alignItems: 'center' }}
            onPress={() => navigation.navigate(item.name)}
            key={indexitem}>
            {icon && (
              <Image
                source={index == indexitem ? icon.selected : icon.unselected}
                style={style.icon}
              />
            )}
            <Text
              style={[
                style.item,
                { color: '#D65344' },
              ]}>
              {item.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const style = StyleSheet.create({
  container: {
    display: 'flex',
    flexDirection: 'row',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: -2,
    },
    elevation: 3,
    padding: 12,
    paddingBottom: 25,
  },
  item: {
    fontSize: RFValue(10, 580),
    color: '#fff',
    fontWeight: '600',
  },
  icon: {
    width: RFValue(22, 580),
    height: RFValue(22, 580),
    tintColor: '#D65344',
  },
});
