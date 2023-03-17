import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { StackActions } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ListItem, Button, Icon } from 'react-native-elements';
import { ScrollView } from 'react-native-gesture-handler';
import OrderDetails from '../OrderDetails/OrderDetails';
import testOrders from '../testOrders';
import Modal from 'react-native-modal';
import { Auth } from 'aws-amplify';
import { TabRouter } from 'react-navigation';
import moment from 'moment';

export default function OrdersList({ navigation, route }) {
  const [orderState, setOrderState] = useState([])

  useEffect(() => {
    const fetchOrder = async () => {
      await Auth.currentUserInfo().then(userinfo => {
        let body = JSON.stringify({
          incoming_Id: userinfo.attributes.sub,
        });
        fetch(
          'https://9yl3ar8isd.execute-api.us-west-1.amazonaws.com/beta/restaurants/getorders',
          {
            method: 'POST',
            mode: 'cors', // no-cors, *cors, same-origin
            cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
            credentials: 'same-origin', // include, *same-origin, omit
            headers: {
              'Content-Type': 'application/json',
              Connection: 'keep-alive',
              // ‘Content-Type’: ‘application/x-www-form-urlencoded’,
            },
            redirect: 'follow', // manual, *follow, error
            referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
            body: body,
          },
        )
          .then(async res => {
            let response = await res.json();
            let orders = JSON.parse(response).orders.OrdersNew.sort((a, b) => {
              if (moment(b.time_order_placed) - moment(a.time_order_placed) < 0) {
                return true;
              } else if (moment(b.time_order_placed) == moment(a.time_order_placed)) {
                if (b.customer_name > a.customer_name) {
                  return true;
                } else {
                  return false;
                }
              } else {
                return false;
              }
            });
            setOrderState(orders.reverse());
            navigation.setParams({
              ...route.params,
              ordersList: orders,
            });
          })
          .catch(err => console.log('responsedataerror', err));
      });
    };

    navigation.addListener('focus', fetchOrder);

    return () => {
      navigation.removeListener('focus', fetchOrder);
    };
  }, [navigation, route.params]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#fff', }}>
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1, minHeight: 200, borderTopWidth: 2, borderColor: '#D65344' }}>
          {orderState.map(order => {
            if (order.order_status === 'Completed') {
              let itemCount = 0;
              for (let item of order.menu_items) {
                itemCount += parseInt(item.quantity) ?? 1
              }
              return (
                <TouchableOpacity
                  style={styles.order}
                  onPress={() => {
                    navigation.navigate('OrderDetails', {
                      order: order,
                    });
                  }}>
                  <View key={'completed_order_display_' + order.dropoffName}>
                    <View style={styles.nameTimeContainer}>
                      <Text h4 style={styles.dropoffName}>
                        {order.customer_name}
                      </Text>
                      <Text h5 style={styles.orderDate}>
                        {moment(order.time_order_placed).format('YYYY-MM-DD h:mm:ss A')}
                      </Text>
                    </View>
                    <Text h5 style={styles.orderItemCount}>
                      {itemCount + (itemCount > 1 ? ' items' : ' item')}
                    </Text>
                    <Text h2 style={styles.orderPrice}>
                      {'$' + parseFloat(order.order_total).toFixed(2)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }
          })}
        </View>
      </View>
    </ScrollView>
  );
}

const statusArray = [
  'Awaiting Confirmation',
  'Being Prepared',
  'Ready for Delivery',
  'Out for Delivery',
];

const styles = StyleSheet.create({
  general: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  order: {
    borderBottomWidth: 2,
    borderColor: 'grey',
    backgroundColor: '#fff',
  },
  orderHeadings: {
    textAlign: 'center',
    color: '#6A6A6A', //'#006FFF',
    padding: 10,
    fontWeight: '600',
    fontSize: 24,
    backgroundColor: '#fff',
  },
  nameTimeContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    justifyContent: 'space-between'
  },
  dropoffName: {
    textAlign: 'left',
    color: '#313131',
    fontWeight: 'bold',
    fontSize: 18,
    marginLeft: 10,
  },
  orderDate: {
    marginLeft: 10,
    fontSize: 16,
    textAlign: 'right',
    marginRight: 10
  },
  orderItemCount: {
    marginLeft: 10,
    marginBottom: 5,
    fontSize: 15,
  },
  orderPrice: {
    textAlign: 'right',
    fontSize: 18,
    fontWeight: 'bold',
    color: '#313131',
    marginRight: 10,
    marginBottom: 15,
  },
  modalInside: {
    backgroundColor: 'white',
    borderRadius: 5,
    padding: 15,
  },
  restaurantName: {
    marginTop: 20,
    textAlign: 'center',
    fontSize: 20,
  },
  orderItemTitle: {},
  orderItemDescription: {
    fontSize: 12,
    color: '#111',
  },
  orderSubtotal: {
    fontSize: 25,
  },
  buttonStyle: {
    backgroundColor: '#D65344',
    paddingTop: 5,
    paddingBottom: 5,
    marginLeft: 5,
    marginRight: 5,
  },
  rejectButtonStyle: {
    backgroundColor: '#D65344',
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 75,
    paddingRight: 75,
  },
  buttonTextStyle: {
    color: '#313131',
  },
  categoryEditorButton: {
    color: '#03a5fc',
  },
});
