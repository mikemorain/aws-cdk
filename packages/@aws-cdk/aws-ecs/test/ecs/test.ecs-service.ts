import { expect, haveResource } from '@aws-cdk/assert';
import ec2 = require('@aws-cdk/aws-ec2');
import cdk = require('@aws-cdk/cdk');
import { Test } from 'nodeunit';
import ecs = require('../../lib');
import { BinPackResource, BuiltInAttributes, NetworkMode } from '../../lib';

export = {
  "When creating an ECS Service": {
    "with only required properties set, it correctly sets default properties"(test: Test) {
      // GIVEN
      const stack = new cdk.Stack();
      const vpc = new ec2.VpcNetwork(stack, 'MyVpc', {});
      const cluster = new ecs.EcsCluster(stack, 'EcsCluster', { vpc });
      const taskDefinition = new ecs.EcsTaskDefinition(stack, 'EcsTaskDef');

      taskDefinition.addContainer("web", {
        image: ecs.DockerHub.image("amazon/amazon-ecs-sample"),
        memoryLimitMiB: 512
      });

      new ecs.EcsService(stack, "EcsService", {
        cluster,
        taskDefinition
      });

      // THEN
      expect(stack).to(haveResource("AWS::ECS::Service", {
        TaskDefinition: {
          Ref: "EcsTaskDefA3440FB6"
        },
        Cluster: {
          Ref: "EcsCluster97242B84"
        },
        DeploymentConfiguration: {
          MaximumPercent: 200,
          MinimumHealthyPercent: 50
        },
        DesiredCount: 1,
        LaunchType: "EC2",
        LoadBalancers: [],
        PlacementConstraints: [],
        PlacementStrategies: [],
        SchedulingStrategy: "REPLICA"
      }));

      test.done();
    },

    "errors if daemon and desiredCount both specified"(test: Test) {
      // GIVEN
      const stack = new cdk.Stack();
      const vpc = new ec2.VpcNetwork(stack, 'MyVpc', {});
      const cluster = new ecs.EcsCluster(stack, 'EcsCluster', { vpc });
      const taskDefinition = new ecs.EcsTaskDefinition(stack, 'EcsTaskDef');

      // THEN
      test.throws(() => {
        new ecs.EcsService(stack, "EcsService", {
          cluster,
          taskDefinition,
          daemon: true,
          desiredCount: 2
        });
      });

      test.done();
    },

    "errors if no container definitions"(test: Test) {
      // GIVEN
      const stack = new cdk.Stack();
      const vpc = new ec2.VpcNetwork(stack, 'MyVpc', {});
      const cluster = new ecs.EcsCluster(stack, 'EcsCluster', { vpc });
      const taskDefinition = new ecs.EcsTaskDefinition(stack, 'EcsTaskDef');

      // THEN
      test.throws(() => {
        new ecs.EcsService(stack, "EcsService", {
          cluster,
          taskDefinition,
        });
      });

      test.done();
    },

    "sets daemon scheduling strategy"(test: Test) {
      // GIVEN
      const stack = new cdk.Stack();
      const vpc = new ec2.VpcNetwork(stack, 'MyVpc', {});
      const cluster = new ecs.EcsCluster(stack, 'EcsCluster', { vpc });
      const taskDefinition = new ecs.EcsTaskDefinition(stack, 'EcsTaskDef');

      taskDefinition.addContainer("web", {
        image: ecs.DockerHub.image("amazon/amazon-ecs-sample"),
        memoryLimitMiB: 512
      });

      new ecs.EcsService(stack, "EcsService", {
        cluster,
        taskDefinition,
        daemon: true
      });

      // THEN
      expect(stack).to(haveResource("AWS::ECS::Service", {
        SchedulingStrategy: "DAEMON"
      }));

      test.done();
    },

    "with a TaskDefinition with AwsVpc network mode": {
      "it creates a security group for the service"(test: Test) {
        // GIVEN
        const stack = new cdk.Stack();
        const vpc = new ec2.VpcNetwork(stack, 'MyVpc', {});
        const cluster = new ecs.EcsCluster(stack, 'EcsCluster', { vpc });
        const taskDefinition = new ecs.EcsTaskDefinition(stack, 'EcsTaskDef', {
          networkMode: NetworkMode.AwsVpc
        });

        taskDefinition.addContainer("web", {
          image: ecs.DockerHub.image("amazon/amazon-ecs-sample"),
          memoryLimitMiB: 512
        });

        new ecs.EcsService(stack, "EcsService", {
          cluster,
          taskDefinition
        });

        // THEN
        expect(stack).to(haveResource("AWS::ECS::Service", {
          NetworkConfiguration: {
            AwsvpcConfiguration: {
              AssignPublicIp: "DISABLED",
              SecurityGroups: [
                {
                  "Fn::GetAtt": [
                    "EcsServiceSecurityGroup8FDFD52F",
                    "GroupId"
                  ]
                }
              ],
              Subnets: [
                {
                  Ref: "MyVpcPrivateSubnet1Subnet5057CF7E"
                },
                {
                  Ref: "MyVpcPrivateSubnet2Subnet0040C983"
                },
                {
                  Ref: "MyVpcPrivateSubnet3Subnet772D6AD7"
                }
              ]
            }
          }
        }));

        test.done();
      }
    },

    "with distinctInstance placement constraint"(test: Test) {
      // GIVEN
      const stack = new cdk.Stack();
      const vpc = new ec2.VpcNetwork(stack, 'MyVpc', {});
      const cluster = new ecs.EcsCluster(stack, 'EcsCluster', { vpc });
      const taskDefinition = new ecs.EcsTaskDefinition(stack, 'EcsTaskDef');

      taskDefinition.addContainer("web", {
        image: ecs.DockerHub.image("amazon/amazon-ecs-sample"),
        memoryLimitMiB: 512
      });

      new ecs.EcsService(stack, "EcsService", {
        cluster,
        taskDefinition,
        placeOnDistinctInstances: true
      });

      // THEN
      expect(stack).to(haveResource("AWS::ECS::Service", {
        PlacementConstraints: [{
            Type: "distinctInstance"
        }]
      }));

      test.done();
    },

    "with memberOf placement constraints"(test: Test) {
      // GIVEN
      const stack = new cdk.Stack();
      const vpc = new ec2.VpcNetwork(stack, 'MyVpc', {});
      const cluster = new ecs.EcsCluster(stack, 'EcsCluster', { vpc });
      const taskDefinition = new ecs.EcsTaskDefinition(stack, 'EcsTaskDef');

      taskDefinition.addContainer("web", {
        image: ecs.DockerHub.image("amazon/amazon-ecs-sample"),
        memoryLimitMiB: 512
      });

      const service = new ecs.EcsService(stack, "EcsService", {
        cluster,
        taskDefinition
      });

      service.placeOnMemberOf("attribute:ecs.instance-type =~ t2.*");

      // THEN
      expect(stack).to(haveResource("AWS::ECS::Service", {
        PlacementConstraints: [{
            Expression: "attribute:ecs.instance-type =~ t2.*",
            Type: "memberOf"
        }]
      }));

      test.done();
    },

    "with placeSpreadAcross placement strategy"(test: Test) {
      // GIVEN
      const stack = new cdk.Stack();
      const vpc = new ec2.VpcNetwork(stack, 'MyVpc', {});
      const cluster = new ecs.EcsCluster(stack, 'EcsCluster', { vpc });
      const taskDefinition = new ecs.EcsTaskDefinition(stack, 'EcsTaskDef');

      taskDefinition.addContainer("web", {
        image: ecs.DockerHub.image("amazon/amazon-ecs-sample"),
        memoryLimitMiB: 512
      });

      const service = new ecs.EcsService(stack, "EcsService", {
        cluster,
        taskDefinition
      });

      service.placeSpreadAcross(BuiltInAttributes.AvailabilityZone);

      // THEN
      expect(stack).to(haveResource("AWS::ECS::Service", {
        PlacementStrategies: [{
          Field: "attribute:ecs.availability-zone",
          Type: "spread"
        }]
      }));

      test.done();
    },

    "errors with placeSpreadAcross placement strategy if daemon specified"(test: Test) {
      // GIVEN
      const stack = new cdk.Stack();
      const vpc = new ec2.VpcNetwork(stack, 'MyVpc', {});
      const cluster = new ecs.EcsCluster(stack, 'EcsCluster', { vpc });
      const taskDefinition = new ecs.EcsTaskDefinition(stack, 'EcsTaskDef');

      taskDefinition.addContainer("web", {
        image: ecs.DockerHub.image("amazon/amazon-ecs-sample"),
        memoryLimitMiB: 512
      });

      const service = new ecs.EcsService(stack, "EcsService", {
        cluster,
        taskDefinition,
        daemon: true
      });

      // THEN
      test.throws(() => {
        service.placeSpreadAcross(BuiltInAttributes.AvailabilityZone);
      });

      test.done();
    },

    "with placeRandomly placement strategy"(test: Test) {
      // GIVEN
      const stack = new cdk.Stack();
      const vpc = new ec2.VpcNetwork(stack, 'MyVpc');
      const cluster = new ecs.EcsCluster(stack, 'EcsCluster', { vpc });
      const taskDefinition = new ecs.EcsTaskDefinition(stack, 'EcsTaskDef');

      taskDefinition.addContainer("web", {
        image: ecs.DockerHub.image("amazon/amazon-ecs-sample"),
        memoryLimitMiB: 512
      });

      const service = new ecs.EcsService(stack, "EcsService", {
        cluster,
        taskDefinition
      });

      service.placeRandomly();

      // THEN
      expect(stack).to(haveResource("AWS::ECS::Service", {
        PlacementStrategies: [{
          Type: "random"
        }]
      }));

      test.done();
    },

    "errors with placeRandomly placement strategy if daemon specified"(test: Test) {
      // GIVEN
      const stack = new cdk.Stack();
      const vpc = new ec2.VpcNetwork(stack, 'MyVpc');
      const cluster = new ecs.EcsCluster(stack, 'EcsCluster', { vpc });
      const taskDefinition = new ecs.EcsTaskDefinition(stack, 'EcsTaskDef');

      taskDefinition.addContainer("web", {
        image: ecs.DockerHub.image("amazon/amazon-ecs-sample"),
        memoryLimitMiB: 512
      });

      const service = new ecs.EcsService(stack, "EcsService", {
        cluster,
        taskDefinition,
        daemon: true
      });

      // THEN
      test.throws(() => {
        service.placeRandomly();
      });

      test.done();
    },

    "with placePackedBy placement strategy"(test: Test) {
      // GIVEN
      const stack = new cdk.Stack();
      const vpc = new ec2.VpcNetwork(stack, 'MyVpc', {});
      const cluster = new ecs.EcsCluster(stack, 'EcsCluster', { vpc });
      const taskDefinition = new ecs.EcsTaskDefinition(stack, 'EcsTaskDef');

      taskDefinition.addContainer("web", {
        image: ecs.DockerHub.image("amazon/amazon-ecs-sample"),
        memoryLimitMiB: 512
      });

      const service = new ecs.EcsService(stack, "EcsService", {
        cluster,
        taskDefinition
      });

      service.placePackedBy(BinPackResource.Memory);

      // THEN
      expect(stack).to(haveResource("AWS::ECS::Service", {
        PlacementStrategies: [{
          Field: "memory",
          Type: "binpack"
        }]
      }));

      test.done();
    },

    "errors with placePackedBy placement strategy if daemon specified"(test: Test) {
      // GIVEN
      const stack = new cdk.Stack();
      const vpc = new ec2.VpcNetwork(stack, 'MyVpc', {});
      const cluster = new ecs.EcsCluster(stack, 'EcsCluster', { vpc });
      const taskDefinition = new ecs.EcsTaskDefinition(stack, 'EcsTaskDef');

      taskDefinition.addContainer("web", {
        image: ecs.DockerHub.image("amazon/amazon-ecs-sample"),
        memoryLimitMiB: 512
      });

      const service = new ecs.EcsService(stack, "EcsService", {
        cluster,
        taskDefinition,
        daemon: true
      });

      // THEN
      test.throws(() => {
        service.placePackedBy(BinPackResource.Memory);
      });

      test.done();
    }
  }
};