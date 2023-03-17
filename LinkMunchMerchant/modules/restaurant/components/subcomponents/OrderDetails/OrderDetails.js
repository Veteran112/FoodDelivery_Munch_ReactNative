import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import {
  ButtonGroup,
  Text
} from 'react-native-elements';
import { createStackNavigator } from '@react-navigation/stack';
import { Auth } from 'aws-amplify';
import Styles from '../../../../theme/Styles';
import moment from 'moment';
import { orderContext } from '../../../context/OrderContext';

export default class OrderDetails extends React.Component {
  static contextType = orderContext;
  constructor(props) {
    super(props);
    this.navigation = props.navigation;
    this.order = props.route.params.order;
    this.route = props.route;
    this.state = {
      selectedIndex: 0,
      order: props.route.params.order,
    };
    const { selectedIndex } = this.state;
  }

  alertStatusChange = selectedIndex => {
    this.setState({ selectedIndex });
    var newStatus = buttons[selectedIndex].value;
    Alert.alert(
      'Order Status Change',
      'Do you want to update this order status to ' + newStatus + '?',
      [
        {
          text: 'Confirm Update',
          onPress: async () => {
            console.log('Confirm button pressed');
            this.order.order_status = buttons[selectedIndex].value;
            var newStatusIndex = buttons
              .map(item => item.value)
              .indexOf(this.order.order_status);
            this.setState({ selectedIndex: newStatusIndex });

            let body = {
              incoming_id: this.state.order.order_id,
              status: buttons[selectedIndex].value,
              wait_time: this.state.order.wait_time,
            };
            if (buttons[selectedIndex].value == "Completed") {
              body = {
                incoming_id: this.state.order.order_id,
                status: buttons[selectedIndex].value,
                time_order_completed: Date(),
                wait_time: this.state.order.wait_time,
                // time_order_completed: moment().format('YYYY-MM-DD h:mm:ss A')
              }
            }

            const response = await fetch(
              'https://9yl3ar8isd.execute-api.us-west-1.amazonaws.com/beta/orders/updateOrder',
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
            );

            console.log(await response.json());
          },
        },
        {
          text: 'Cancel',
          onPress: () => console.log('Cancel Pressed'),
          style: 'cancel',
        },
      ],
      { cancelable: false },
    );
  };

  checkForSpecialInstructions(item) {
    if (item.specialInstructions !== '') {
      return (
        <Text style={styles.orderDetailsSpecialInstructions}>
          {'Special Instructions: ' + item.instructions}
        </Text>
      );
    }
  }

  formatInt(item) {
    if (item.indexOf(".") != -1 && item.split(".")[1].length < 2) {
      return item + "0"
    } else if (item.indexOf(".") === -1 || item.split(".")[1].length > 2) {
      return parseFloat(item).toFixed(2).toString()
    } else {
      return item
    }
  }

  render() {
    let itemCount = 0;
    for (let item of this.state.order.menu_items) {
      itemCount += parseInt(item.quantity) ?? 1
    }
    return (
      <View style={styles.general}>
        <View style={styles.orderDetailsHeader}>
          <Text h4 style={styles.dropoffName}>
            {this.order.customer_name}
          </Text>
        </View>
        <Text h5 style={styles.orderDate}>
          {this.props.route.params.order.order_status !== 'Completed' ?
            `Order Placed: ${moment(this.order.time_order_placed).format('YYYY-MM-DD h:mm:ss A')}` :
            `Order Completed: ${this.order.time_order_completed}`
          }
        </Text>
        {this.props.route.params.order.order_status !== 'Completed' && (
          <Text h5 style={styles.orderDate}>
            Time: {this.order.wait_time} minutes
          </Text>
        )}
        {this.props.route.params.order.order_status !== 'Completed' && (
          <>
            <Text style={styles.orderStatus}>{'Order Status:'}</Text>
            <ButtonGroup
              onPress={this.alertStatusChange}
              selectedIndex={buttons
                .map(item => item.value)
                .indexOf(this.order.order_status)}
              buttons={buttons.map(item => item.title)}
              innerBorderStyle={{ width: 1.5 }}
              buttonStyle={styles.orderStatusButtons}
              containerStyle={{ height: 200 }}
              selectedButtonStyle={{ backgroundColor: '#D65344' }}
              vertical={true}
            />
          </>
        )}

        <Text h5 style={styles.orderItemCount}>
          {this.order.menu_items.length + ' items'}
        </Text>
        {this.order.menu_items.map((item, i) => {
          return (
            <View
              style={styles.orderDetailsItem}
              key={this.order.order_id + '_' + item.item + '_' + i}>
              <View style={styles.orderItemContainer}>
                <Text style={styles.orderDetailsItemName}>{item.quantity}x {item.item}</Text>
                <Text style={styles.orderItemPrice}>${this.formatInt(item.price)}</Text>
              </View>
              {this.checkForSpecialInstructions(item)}
            </View>
          );
        })}
        <View style={styles.orderTotalContainer}>
          <Text style={styles.orderDetailsItemName}>Total Order</Text>
          <Text style={styles.orderItemPrice}>${this.formatInt(this.order.order_total)}</Text>
        </View>
      </View>
    );
  }
}

const buttons = [
  { title: 'Awaiting Confirmation', value: 'Awaiting Confirmation' },
  { title: 'Being Prepared', value: 'Being Prepared' },
  { title: 'Ready For Pick Up', value: 'Ready For Pick Up' },
  { title: 'Complete Order', value: 'Completed' },
];

const styles = StyleSheet.create({
  general: {
    flex: 1,
    backgroundColor: '#fff',
  },
  orderDetailsHeader: {
    flexDirection: 'row',
    marginBottom: 10,
    marginTop: 20,
  },
  orderHeadings: {
    textAlign: 'left',
    color: '#313131',
    padding: 10,
    fontWeight: 'bold',
    fontSize: 24,
    backgroundColor: '#fff',
  },
  dropoffName: {
    textAlign: 'left',
    color: '#313131',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 10,
    flex: 2,
  },
  orderStatusButtons: {
    height: 50,
  },
  orderStatus: {
    color: '#242424',
    fontSize: 22,
    marginLeft: 10,
    textAlign: 'left',
  },
  orderDate: {
    marginLeft: 10,
    fontSize: 17,
    marginBottom: 10,
  },
  orderItemCount: {
    marginTop: 10,
    marginLeft: 10,
    fontSize: 17,
    color: '#838383',
  },
  orderDetailsItem: {
    borderBottomWidth: 2,
    borderColor: '#D65344',
    backgroundColor: '#fff',
  },
  orderItemContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 5,
  },
  orderDetailsItemName: {
    fontSize: 17,
    color: '#313131',
    marginLeft: 10,
  },
  orderItemPrice: {
    marginRight: 10,
    textAlign: 'right',
    fontSize: 17,
  },
  orderDetailsPrice: {
    textAlign: 'right',
    flex: 1,
    marginRight: 10,
    marginTop: 20,
  },
  orderDetailsItemDescription: {
    marginLeft: 10,
    marginRight: 10,
    marginBottom: 10,
    fontSize: 18,
    color: '#363636',
  },
  orderDetailsSpecialInstructions: {
    marginLeft: 10,
    marginRight: 10,
    marginBottom: 5,
    fontSize: 16,
    color: '#363636',
  },
  orderTotalContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 5,
  },
});
