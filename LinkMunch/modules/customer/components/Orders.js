import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import Loading from 'react-native-loading-spinner-overlay';
import { ScrollView } from 'react-native-gesture-handler';
import OrderDetails from './subcomponents/OrderDetails/OrderDetails';
import { Auth } from 'aws-amplify';
import moment from "moment";

//JSON Object

const Stack = createStackNavigator();

export default class Orders extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    return (
      <Stack.Navigator intialRouteName="Orders">
        <Stack.Screen
          name="Orders"
          component={OrdersList}
          initialParams={{}}
          options={({ navigation }) => ({
            title: 'Orders',
            headerStyle: {
              backgroundColor: '#fff',
            },
            headerTitleStyle: {
              color: 'black',
            },
            headerTitleAlign: 'center',
            headerTintColor: '#E82800',
          })}
        />
        <Stack.Screen
          name="OrderDetails"
          component={OrderDetails}
          options={({ navigation }) => ({
            title: 'Order Details',
            headerTitleStyle: {
              color: 'black',
            },
            headerTitleAlign: 'center',
            headerTintColor: '#E82800',
          })}
        />
      </Stack.Navigator>
    );
  }
}

function OrdersList({ navigation, route }) {

  const [orders, setOrders] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [userId, setUserId] = useState('');
  const [loading, setloading] = useState(false);

  useEffect(() => {
    navigation.addListener('focus', () => {
      setloading(true);
      Auth.currentUserInfo().then(info => {
        let body = {
          'incoming_id': info.username,
        };
        setUserId(info.username);

        fetch(
          'https://9yl3ar8isd.execute-api.us-west-1.amazonaws.com/beta/customerorders',
          {
            method: 'POST',
            mode: 'cors', // no-cors, *cors, same-origin
            cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
            credentials: 'same-origin', // include, *same-origin, omit
            headers: {
              'Content-Type': 'application/json',
              'Connection': 'keep-alive',
            },
            redirect: 'follow', // manual, *follow, error
            referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
            body: JSON.stringify(body),
          },
        )
          .then(async res => {
            let response = await res.json();
            setloading(false);
            let orders = response.sort((a, b) => {
              if (moment(b.time_order_placed) - moment(a.time_order_placed) > 0) {
                return true;
              } else if (moment(b.time_order_placed) == moment(a.time_order_placed)) {
                if (b.restaurant_name > a.restaurant_name) {
                  return true;
                } else {
                  return false;
                }
              } else {
                return false;
              }
            });
            orders = orders.filter((order) => {
              return order.order_status !== 'Rejected'
            })
            const activeOrders = orders.filter((order) => {
              return order.order_status !== 'Completed' && order.order_status !== 'Rejected'
            })
            setActiveOrders(activeOrders);
            setOrders(orders);
          })
          .catch(err => {
            console.log('responsedataerror', err);
            setloading(false);
          });
      });
    });
  }, [navigation, route.params]);

  useEffect(() => {
    if (userId != '' && activeOrders.length > 0) {
      const interval = setInterval(() => {
        let body = {
          'incoming_id': userId,
        };
        fetch(
          'https://9yl3ar8isd.execute-api.us-west-1.amazonaws.com/beta/customerorders',
          {
            method: 'POST',
            mode: 'cors', // no-cors, *cors, same-origin
            cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
            credentials: 'same-origin', // include, *same-origin, omit
            headers: {
              'Content-Type': 'application/json',
              'Connection': 'keep-alive',
            },
            redirect: 'follow', // manual, *follow, error
            referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
            body: JSON.stringify(body),
          },
        )
          .then(async res => {
            let response = await res.json();
            let rejectedOrders = response;
            const orders = response.filter((order) => {
              return order.order_status !== 'Rejected' && order.order_status !== 'Completed'
            })
            rejectedOrders = rejectedOrders.filter((order) => {
              return order.order_status === 'Rejected'
            })

            const rejectedOrderIds = rejectedOrders.map((order) => order.order_id);
            const activeOrderIds = activeOrders.map(order => order.order_id);

            let newRejects = [];
            if (rejectedOrderIds.length > 0) {
              for (let rejectId of rejectedOrderIds) {
                if (activeOrderIds.includes(rejectId)) {
                  newRejects = [...newRejects, rejectId];
                }
              }

              if (newRejects.length > 0) {
                let restaurants = [];
                const updated = activeOrders.filter((order) => {
                  if (!newRejects.includes(order.order_id)) {
                    return true;
                  } else {
                    restaurants.push(order.restaurant_name);
                    return false;
                  }
                });
                setActiveOrders(updated);
                restaurants = Array.from(new Set(restaurants));
                Alert.alert(
                  "Order Declined",
                  restaurants.join(", ") + " declined your order."
                );
              }
            }
          })
          .catch(err => {
            console.log('responsedataerror', err);
            this.setState({ loading: false });
          });
      }, 60000);

      return () => {
        console.log(`clearing interval`);
        isMounted = false;
        clearInterval(interval);
      };
    }
  }, [userId, activeOrders]);


  return (
    <ScrollView style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <Text h2 style={styles.orderHeadings}>
          {'Active Orders (' + activeOrders.length + ')'}
        </Text>
        <View style={{ flex: 1, minHeight: 200 }}>
          {activeOrders.map( (order, index) => {
            let itemCount = 0;
            for (let item of order.menu_items) {
              itemCount += parseInt(item.quantity) ?? 1
            }
            return (
              <TouchableOpacity
                style={styles.order}
                //TO DO: Bind this as a function
                onPress={() => {
                  let newOrder = JSON.parse(JSON.stringify(order));
                  navigation.navigate('OrderDetails', {
                    navigation: navigation,
                    ordersList: orders,
                    newOrder: newOrder,
                    order: order,
                  });
                }}>
                <View key={index}>
                  <Text h5 style={styles.orderDate}>
                    {moment(order.time_order_placed).format('YYYY-MM-DD h:mm:ss A')}
                  </Text>
                  <Text h4 style={styles.dropoffName}>
                    {order.restaurant_name}
                  </Text>
                  <Text h4 style={styles.dropoffName}>
                    {order.status}
                  </Text>
                  <Text h5 style={styles.orderItemCount}>
                    {itemCount + (itemCount > 1 ? ' items' : ' item')}
                  </Text>
                  <Text h2 style={styles.orderPrice}>
                    {'$' + order.order_total.toFixed(2)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text h2 style={styles.orderHeadings}>
          {'Order History'}
        </Text>
        <View style={{ flex: 1, minHeight: 200 }}>
          {orders.map(order => {
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
                      ordersList: orders,
                      order: order,
                    });
                  }}>
                  <View key={'completed_order_display_' + order.dropoffName}>
                    <Text h4 style={styles.dropoffName}>
                      {order.restaurant_name}
                    </Text>
                    <Text h5 style={styles.orderDate}>
                      {moment(order.time_order_placed).format('YYYY-MM-DD h:mm:ss A')}
                    </Text>
                    <Text h5 style={styles.orderItemCount}>
                      {itemCount + (itemCount > 1 ? ' items' : ' item')}
                    </Text>
                    <Text h2 style={styles.orderPrice}>
                      {'$' + order.order_total.toFixed(2)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }
          })}
        </View>
      </View>
      <Loading visible={loading} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  general: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  order: {
    borderBottomWidth: 2,
    borderColor: '#eee',
    backgroundColor: '#fff',
  },
  orderHeadings: {
    textAlign: 'center',
    color: '#E82800',
    padding: 10,
    fontWeight: '600',
    fontSize: 24,
    backgroundColor: '#fff',
  },
  dropoffName: {
    textAlign: 'left',
    color: '#313131',
    fontWeight: 'bold',
    fontSize: 18,
    marginLeft: 10,
    marginTop: 10,
  },
  orderDate: {
    marginLeft: 10,
    fontSize: 16,
    marginTop: 10,
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
});
